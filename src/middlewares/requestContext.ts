import { AsyncLocalStorage } from "node:async_hooks";

export type RequestContext = Readonly<{
  requestId: string;
  method: string;
  path: string;
}>;

const requestContextStorage = new AsyncLocalStorage<RequestContext>();

/** Runs request work inside an isolated asynchronous logging context. */
export const runWithRequestContext = <T>(context: RequestContext, callback: () => T) =>
  requestContextStorage.run(context, callback);

/** Returns the active request context when execution belongs to an HTTP request. */
export const getRequestContext = () => requestContextStorage.getStore();
