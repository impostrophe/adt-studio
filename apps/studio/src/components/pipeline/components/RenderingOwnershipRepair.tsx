import { useState } from "react"
import DOMPurify from "dompurify"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useLingui } from "@lingui/react/macro"
import { api, BASE_URL } from "@/api/client"
import { useBookRun } from "@/hooks/use-book-run"
import { invalidateStoryboardDependents } from "@/hooks/use-page-mutations"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useFloatingSaveDirtyEntries } from "./floating-save"

function retainedPreview(html: string, bookLabel: string): string {
  // The preview is inert; inspect the exact original separately below. Resolve
  // book images by ID so legacy relative URLs work without permitting remote
  // resources or executing retained custom scripts during ownership review.
  const fragment = DOMPurify.sanitize(html, { RETURN_DOM_FRAGMENT: true, FORBID_ATTR: ["src", "srcset", "poster", "href", "xlink:href", "action"] })
  // Keep the fragment in the sanitizer's inert document. Adopting it into the
  // application document can start resource requests before iframe CSP applies.
  const body = fragment.ownerDocument!.createElement("div")
  body.append(fragment)
  const imageBase = new URL(`${BASE_URL}/books/${encodeURIComponent(bookLabel)}/images/`, window.location.href)
  for (const image of body.querySelectorAll("img[data-id]")) {
    image.setAttribute("src", new URL(encodeURIComponent(image.getAttribute("data-id")!), imageBase).href)
  }
  return `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src ${imageBase.href}">${body.innerHTML}`
}

export function RenderingOwnershipRepair({ bookLabel, pageId }: { bookLabel: string; pageId: string }) {
  const { t } = useLingui()
  const [open, setOpen] = useState(false)
  const [selection, setSelection] = useState<Record<string, Record<number, string>>>({})
  const client = useQueryClient()
  const { isRunning } = useBookRun()
  const dirty = useFloatingSaveDirtyEntries().length > 0
  const key = ["books", bookLabel, "pages", pageId, "rendering-ownership"]
  const query = useQuery({ queryKey: key, queryFn: () => api.getRenderingOwnership(bookLabel, pageId), enabled: open, staleTime: Infinity, refetchOnWindowFocus: false })
  const reviewKey = JSON.stringify([bookLabel, pageId, query.data?.sectioningNode, query.data?.sectioningVersion, query.data?.renderingVersion])
  const choices = selection[reviewKey] ?? {}
  const repair = useMutation({
    mutationFn: (renderingIndex: number) => api.repairRenderingOwner(bookLabel, pageId, {
      renderingIndex, sectionId: choices[renderingIndex], renderingVersion: query.data!.renderingVersion, sectioningNode: query.data!.sectioningNode, sectioningVersion: query.data!.sectioningVersion,
    }),
    onSuccess: async () => {
      setSelection({})
      await Promise.all([
        client.invalidateQueries({ queryKey: ["books", bookLabel, "pages"] }),
        invalidateStoryboardDependents(client, bookLabel),
      ])
    },
  })
  const reload = () => { setSelection({}); repair.reset(); void query.refetch() }
  return <Dialog open={open} onOpenChange={value => { setOpen(value); if (value) reload() }}>
    <DialogTrigger asChild><Button size="sm" variant="outline">{t`Repair section ownership: ${pageId}`}</Button></DialogTrigger>
    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{t`Repair section ownership`}</DialogTitle>
        <DialogDescription>{t`Choose the source section that owns each retained rendering. Linking preserves its HTML, scripts, answers and history, including old HTML owner attributes. It does not generate content or approve its freshness.`}</DialogDescription>
      </DialogHeader>
      {(query.error || repair.error) && <p role="alert" className="text-sm text-red-700">{(query.error ?? repair.error)?.message}</p>}
      <Button variant="outline" size="sm" onClick={reload} disabled={repair.isPending || query.isFetching}>{t`Reload ownership review`}</Button>
      {query.isFetching && <p role="status">{t`Loading retained content…`}</p>}
      {query.data?.unresolved.length === 0 && <p>{t`Every rendering on this page has a verified owner.`}</p>}
      {query.data?.unresolved.map(({ renderingIndex, rendering }) => <section key={`${query.data.renderingVersion}:${renderingIndex}`} className="space-y-3 rounded border p-3">
        <p className="text-sm font-medium">{t`Retained rendering ${String(renderingIndex + 1)}`}</p>
        <iframe title={t`Retained rendering preview ${String(renderingIndex + 1)}`} sandbox="" className="h-56 w-full border bg-white" srcDoc={retainedPreview(rendering.html, bookLabel)} />
        <details><summary className="cursor-pointer text-sm">{t`Inspect original HTML and answers`}</summary><pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all text-xs">{rendering.html}{"\n"}{JSON.stringify(rendering.activityAnswers ?? {}, null, 2)}</pre></details>
        {query.data.choices.length === 0 ? <p className="text-sm">{t`No unclaimed source section is available. Restore the matching Sectioning version in Storyboard, then reload this review.`}</p> : <>
          <label className="block space-y-1 text-sm"><span>{t`Matching source section`}</span>
            <select className="w-full rounded border bg-background p-2" value={choices[renderingIndex] ?? ""} disabled={query.isFetching || repair.isPending} onChange={event => setSelection({ [reviewKey]: { ...choices, [renderingIndex]: event.target.value } })}>
              <option value="">{t`Choose a section after reviewing its content`}</option>
              {query.data.choices.map(choice => <option key={choice.sectionId} value={choice.sectionId}>{choice.sectionId} — {choice.text || choice.sectionType}</option>)}
            </select>
          </label>
          <Button disabled={!choices[renderingIndex] || query.isFetching || repair.isPending || isRunning || dirty} onClick={() => repair.mutate(renderingIndex)}>{t`Link retained content to selected section`}</Button>
        </>}
      </section>)}
      {(dirty || isRunning) && <p className="text-sm">{t`Finish current edits and runs before linking retained content.`}</p>}
    </DialogContent>
  </Dialog>
}
