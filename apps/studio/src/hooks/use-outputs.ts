import { useQuery } from "@tanstack/react-query"
import type { OutputDisclosureOptions } from "@adt/types"
import { api } from "@/api/client"

export function useOutputs(bookLabel: string, disclosure = false, features?: OutputDisclosureOptions) {
  return useQuery({ queryKey: ["books", bookLabel, "outputs", disclosure, features], queryFn: () => disclosure ? api.getOutputDisclosure(bookLabel, features) : api.getOutputs(bookLabel), staleTime: 1000, enabled: !!bookLabel })
}
