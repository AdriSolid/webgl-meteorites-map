import { useState, useLayoutEffect } from "react";
import { ResizeState } from "../types";

function useWindowSize(): ResizeState {
  const [size, setSize] = useState<ResizeState>([0, 0]);

  useLayoutEffect((): (() => void) => {
    function updateSize(): void {
      setSize([window.innerWidth, window.innerHeight]);
    }

    window.addEventListener("resize", updateSize);
    updateSize();

    return (): void => window.removeEventListener("resize", updateSize);
  }, []);

  return size;
}

export default useWindowSize;
