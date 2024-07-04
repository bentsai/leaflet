"use client";

import { useEffect } from "react";
import { useBlocks } from "src/hooks/queries/useBlocks";
import { useEntity } from "src/replicache";
import * as Y from "yjs";
import * as base64 from "base64-js";
import { YJSFragmentToString } from "components/TextBlock/RenderYJSFragment";

export function UpdatePageTitle(props: { entityID: string }) {
  let blocks = useBlocks(props.entityID).filter(
    (b) => b.type === "text" || b.type === "heading",
  );
  let firstBlock = blocks[0];
  let content = useEntity(
    firstBlock?.type === "heading" ? firstBlock.value : null,
    "block/text",
  );
  useEffect(() => {
    if (content) {
      let doc = new Y.Doc();
      const update = base64.toByteArray(content.data.value);
      Y.applyUpdate(doc, update);
      let nodes = doc.getXmlElement("prosemirror").toArray();
      document.title = YJSFragmentToString(nodes[0]) || "Untitled Leaflet";
    }
  }, [content]);

  return null;
}
