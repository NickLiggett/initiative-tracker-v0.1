import { useCallback, useEffect, useState } from "react";
import { listOwnedDocumentKeys } from "../../api/ownership";

/**
 * The keys of the documents the user owns, and a function to load them again (after making a creature, which can
 * create their homebrew document). If they can't be loaded, the user owns nothing.
 */
export default function useOwnedDocuments() {
  const [owned, setOwned] = useState(() => new Set());
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    listOwnedDocumentKeys({ signal: controller.signal })
      .then(setOwned)
      .catch(() => {
        if (!controller.signal.aborted) {
          setOwned(new Set());
        }
      });
    return () => controller.abort();
  }, [version]);

  const refresh = useCallback(() => setVersion((current) => current + 1), []);
  return { owned, refresh };
}
