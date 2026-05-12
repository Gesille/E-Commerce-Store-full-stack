import { useEffect } from "react";

const useBarcode = (onScan: (code: string) => void) => {
  useEffect(() => {
    let buffer = "";
    let timer: ReturnType<typeof setTimeout>;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        if (buffer.length > 0) {
          onScan(buffer.trim());
          buffer = "";
        }
      } else {
        buffer += e.key;
        clearTimeout(timer);
        timer = setTimeout(() => {
          buffer = "";
        }, 300);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onScan]);
};

export default useBarcode;