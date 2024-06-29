import { Schema, Node, MarkSpec } from "prosemirror-model";
import { marks } from "prosemirror-schema-basic";
import { theme } from "../../tailwind.config";

let baseSchema = {
  marks: {
    strong: marks.strong,
    em: marks.em,
    underline: {
      parseDOM: [
        { tag: "u" },
        {
          style: "text-decoration=underline",
        },
        {
          style: "text-decoration=none",
          clearMark: (m) => m.type.name == "underline",
        },
      ],
      toDOM() {
        return ["u", { class: "underline" }, 0];
      },
    } as MarkSpec,
    strikethrough: {
      parseDOM: [
        {
          style: "text-decoration=line-through",
        },
        {
          style: "text-decoration=none",
          clearMark: (m) => m.type.name == "strikethrough",
        },
      ],
      toDOM() {
        return [
          "span",
          {
            style: `text-decoration: line-through; text-decoration-color: ${theme.colors.tertiary}`,
          },
          0,
        ];
      },
    } as MarkSpec,
    link: {
      attrs: {
        href: {},
      },
      inclusive: false,
      parseDOM: [
        {
          tag: "a[href]",
          getAttrs(dom: HTMLElement) {
            return {
              href: dom.getAttribute("href"),
            };
          },
        },
      ],
      toDOM(node) {
        let { href } = node.attrs;
        return ["a", { href }, 0];
      },
    } as MarkSpec,
  },
  nodes: {
    doc: { content: "block" },
    paragraph: {
      content: "inline*",
      group: "block",
      parseDOM: [{ tag: "p" }],
      toDOM: () => ["p", 0] as const,
    },
    text: {
      group: "inline",
    },
  },
};
export const schema = new Schema(baseSchema);

export const multiBlockSchema = new Schema({
  marks: baseSchema.marks,
  nodes: { ...baseSchema.nodes, doc: { content: "block+" } },
});
