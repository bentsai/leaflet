"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { DeepReadonlyObject, Replicache, WriteTransaction } from "replicache";
import { Pull } from "./pull";
import { mutations } from "./mutations";
import { Attributes } from "./attributes";
import { Push } from "./push";
import { createClient } from "@supabase/supabase-js";
import { Database } from "../supabase/database.types";
import { clientMutationContext } from "./clientMutationContext";

export type Fact<A extends keyof typeof Attributes> = {
  id: string;
  entity: string;
  attribute: A;
  data: Data<A>;
};

type Data<A extends keyof typeof Attributes> = {
  text: { type: "text"; value: string };
  "ordered-reference": {
    type: "ordered-reference";
    position: string;
    value: string;
  };
  reference: { type: "reference"; value: string };
}[(typeof Attributes)[A]["type"]];

let ReplicacheContext = createContext({
  rep: null as null | Replicache<ReplicacheMutators>,
});
export function useReplicache() {
  return useContext(ReplicacheContext);
}
export type ReplicacheMutators = {
  [k in keyof typeof mutations]: (
    tx: WriteTransaction,
    args: Parameters<(typeof mutations)[k]>[0],
  ) => Promise<void>;
};
export function ReplicacheProvider(props: {
  name: string;
  children: React.ReactNode;
}) {
  let [rep, setRep] = useState<null | Replicache<ReplicacheMutators>>(null);
  useEffect(() => {
    let supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    );
    let newRep = new Replicache({
      pushDelay: 500,
      mutators: Object.fromEntries(
        Object.keys(mutations).map((m) => {
          return [
            m,
            async (tx: WriteTransaction, args: any) => {
              await mutations[m as keyof typeof mutations](
                args,
                clientMutationContext(tx),
              );
            },
          ];
        }),
      ) as ReplicacheMutators,
      licenseKey: "l381074b8d5224dabaef869802421225a",
      pusher: async (pushRequest) => {
        return {
          response: await Push(pushRequest, props.name),
          httpRequestInfo: { errorMessage: "", httpStatusCode: 200 },
        };
      },
      puller: async (pullRequest) => {
        return {
          response: await Pull(pullRequest, props.name),
          httpRequestInfo: { errorMessage: "", httpStatusCode: 200 },
        };
      },
      name: props.name,
      indexes: {
        eav: { jsonPointer: "/indexes/eav", allowEmpty: true },
        aev: { jsonPointer: "/indexes/aev", allowEmpty: true },
        vae: { jsonPointer: "/indexes/vae", allowEmpty: true },
      },
    });
    setRep(newRep);
    let channel = supabase.channel(`rootEntity:${props.name}`);

    channel.on("broadcast", { event: "poke" }, () => {
      newRep.pull();
    });
    channel.subscribe();
    return () => {
      newRep.close();
      setRep(null);
      channel.unsubscribe();
    };
  }, [props.name]);
  return (
    <ReplicacheContext.Provider value={{ rep }}>
      {props.children}
    </ReplicacheContext.Provider>
  );
}

type CardinalityResult<A extends keyof typeof Attributes> =
  (typeof Attributes)[A]["cardinality"] extends "one"
    ? DeepReadonlyObject<Fact<A>>
    : DeepReadonlyObject<Fact<A>>[];
export function useEntity<A extends keyof typeof Attributes>(
  entity: string,
  attribute: A,
): CardinalityResult<A> {
  let [data, setData] = useState<DeepReadonlyObject<Fact<A>[]>>([]);
  let { rep } = useReplicache();
  useEffect(() => {
    if (!rep) return;
    return rep.subscribe(
      (tx) => {
        return tx
          .scan<Fact<A>>({ indexName: "eav", prefix: `${entity}-${attribute}` })
          .toArray();
      },
      { onData: setData },
    );
  }, [entity, attribute, rep]);
  return Attributes[attribute].cardinality === "many"
    ? (data as CardinalityResult<A>)
    : (data[0] as CardinalityResult<A>);
}