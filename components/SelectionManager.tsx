"use client";
import { useEffect, useRef } from "react";
import { create } from "zustand";
import { useReplicache } from "src/replicache";
import { useUIState } from "src/useUIState";
export const useSelectingMouse = create(() => ({
  start: null as null | { top: number; left: number },
}));

export function SelectionManager() {
  let moreThanOneSelected = useUIState((s) => s.selectedBlock.length > 1);
  let { rep } = useReplicache();
  useEffect(() => {
    if (moreThanOneSelected) {
      let listener = async (e: KeyboardEvent) => {
        console.log(e);
        if (e.key === "Backspace" || e.key === "Delete") {
          for (let entity of useUIState.getState().selectedBlock) {
            await rep?.mutate.removeBlock({ blockEntity: entity });
          }
        }
      };
      window.addEventListener("keydown", listener);
      return () => {
        window.removeEventListener("keydown", listener);
      };
    }
  }, [moreThanOneSelected, rep]);
  let dragStart = useSelectingMouse((s) => s.start);
  let initialContentEditableParent = useRef<null | Node>(null);
  let savedSelection = useRef<Range[] | null>();
  useEffect(() => {
    let mouseDownListener = (e: MouseEvent) => {
      initialContentEditableParent.current = getContentEditableParent(
        e.target as Node,
      );
      useSelectingMouse.setState({
        start: { left: e.clientX, top: e.clientY },
      });
    };
    let mouseUpListener = (e: MouseEvent) => {
      e.preventDefault();
      if (
        initialContentEditableParent.current &&
        getContentEditableParent(e.target as Node) !==
          initialContentEditableParent.current
      ) {
        setTimeout(() => {
          window.getSelection()?.removeAllRanges();
        }, 10);
      }
      savedSelection.current = null;
      useSelectingMouse.setState({ start: null });
    };
    window.addEventListener("mousedown", mouseDownListener);
    window.addEventListener("mouseup", mouseUpListener);
    return () => {
      window.removeEventListener("mousedown", mouseDownListener);
      window.removeEventListener("mouseup", mouseUpListener);
    };
  }, []);
  useEffect(() => {
    if (!dragStart) return;
    let mouseMoveListener = (e: MouseEvent) => {
      if (e.buttons !== 1) return;
      if (initialContentEditableParent.current) {
        if (
          initialContentEditableParent.current ===
          getContentEditableParent(e.target as Node)
        ) {
          if (savedSelection.current) {
            restoreSelection(savedSelection.current);
          }
          savedSelection.current = null;
          return;
        }
        if (!savedSelection.current) savedSelection.current = saveSelection();
      }
      window.getSelection()?.removeAllRanges();
    };
    window.addEventListener("mousemove", mouseMoveListener);
    return () => {
      window.removeEventListener("mousemove", mouseMoveListener);
    };
  }, [dragStart]);
  return null;
}

export function saveSelection() {
  let selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    let ranges: Range[] = [];
    for (let i = 0; i < selection.rangeCount; i++) {
      ranges.push(selection.getRangeAt(i));
    }
    return ranges;
  }
  return [];
}

export function restoreSelection(savedRanges: Range[]) {
  if (savedRanges) {
    let selection = window.getSelection() || new Selection();
    selection.removeAllRanges();
    for (let i = 0; i < savedRanges.length; i++) {
      selection.addRange(savedRanges[i]);
    }
  }
}

function getContentEditableParent(e: Node | null): Node | null {
  let element: Node | null = e;
  while (element && element !== document) {
    if ((element as HTMLElement).contentEditable === "true") {
      return element;
    }
    element = element.parentNode;
  }
  return null;
}