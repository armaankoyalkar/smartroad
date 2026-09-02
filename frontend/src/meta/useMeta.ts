import { useContext } from "react";
import { MetaContext, type MetaContextValue } from "./context";

/** Categories (with API colours), enums, labels and the map defaults. */
export function useMeta(): MetaContextValue {
  const context = useContext(MetaContext);
  if (!context) throw new Error("useMeta must be used inside <MetaProvider>");
  return context;
}
