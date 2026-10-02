import { checkDatabaseConnection } from "./healthQueries";

/** Reports whether persistence is currently available for request processing. */
export const isApplicationReady = async () => {
  try {
    await checkDatabaseConnection();
    return true;
  } catch {
    return false;
  }
};
