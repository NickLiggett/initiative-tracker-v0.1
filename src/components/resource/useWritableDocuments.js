import { useCallback, useEffect, useState } from "react";
import { listWritableDocumentKeys } from "../../api/ownership";

/**
 * The keys of the documents whose content the user can change (their own, and those shared with them as an editor),
 * and a function to load them again (after making something, which can create their homebrew document). If they
 * can't be loaded, the user can change nothing.
 */
export default function useWritableDocuments() {
  const [writable, setWritable] = useState(() => new Set());
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    listWritableDocumentKeys({ signal: controller.signal })
      .then(setWritable)
      .catch(() => {
        if (!controller.signal.aborted) {
          setWritable(new Set());
        }
      });
    return () => controller.abort();
  }, [version]);

  const refresh = useCallback(() => setVersion((current) => current + 1), []);
  return { writable, refresh };
}
