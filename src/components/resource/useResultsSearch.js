import { useCallback, useEffect, useRef, useState } from "react";

export const PAGE_SIZES = [25, 50, 100];

/** "level" + "desc" -> "level,desc": how the backend takes a sort. */
export const sortParam = ({ field, direction }) => `${field},${direction}`;

/**
 * Runs a search for a page of results, on request. The criteria are those given to `run` (the Search button), not
 * anything still being typed; paging, sorting and the page size ask again for the same criteria. A newer request
 * replaces an older one still on its way, and a failed one leaves the results already shown where they are.
 *
 * @param {(request: {criteria: object, page: number, pageSize: number, sort: string, signal: AbortSignal}) => Promise<{content: object[], page: object}>} list
 *   asks the backend; it is read when a request is made, so it may change between renders
 * @param {{field: string, direction: "asc"|"desc"}} defaultSort
 * @returns {{result: ?object, loading: boolean, error: ?string, hasRun: boolean, page: number, pageSize: number, sort: object,
 *   run: (criteria: object) => void, setPage: Function, setPageSize: Function, setSort: Function}}
 */
export default function useResultsSearch(list, defaultSort) {
  const [request, setRequest] = useState({ criteria: null, page: 0, pageSize: PAGE_SIZES[0], sort: defaultSort });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const latestList = useRef(list);
  latestList.current = list;

  useEffect(() => {
    if (!request.criteria) {
      return undefined;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    latestList
      .current({ ...request, sort: sortParam(request.sort), signal: controller.signal })
      .then((found) => {
        if (!controller.signal.aborted) {
          setResult(found);
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted && e.name !== "AbortError") {
          setError(e.message || "Couldn't load the results. Is the backend running?");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [request]);

  return {
    result,
    loading,
    error,
    hasRun: request.criteria !== null,
    page: request.page,
    pageSize: request.pageSize,
    sort: request.sort,
    run: useCallback((criteria) => setRequest((current) => ({ ...current, criteria, page: 0 })), []),
    setPage: useCallback((page) => setRequest((current) => ({ ...current, page })), []),
    setPageSize: useCallback((pageSize) => setRequest((current) => ({ ...current, pageSize, page: 0 })), []),
    setSort: useCallback((sort) => setRequest((current) => ({ ...current, sort, page: 0 })), []),
  };
}
