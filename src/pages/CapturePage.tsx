// Copy/paste capture works offline and never calls an external provider or sends saved directory data.
import { useRef, useState } from 'react'
import { parseCapture } from '../capture/schema'
import { buildPrompt, SHARING_NOTICE } from '../capture/prompt'
import { resolveCapture, reviewCounts, type Review } from '../capture/resolver'
import { readSurnameSetting } from '../capture/settings'
import { saveCapture } from '../capture/save'
import { undoCapture } from '../capture/undo'
import { PersonReviewCard } from '../components/capture/PersonReviewCard'
import { ContextReview } from '../components/capture/ContextReview'
import { RelationshipReview } from '../components/capture/RelationshipReview'
import { CaptureHistory } from '../components/capture/CaptureHistory'
import { Button } from '../components/ui/Button'
import { showToast } from '../components/ui/Toast'
import { useUnsavedDraft } from '../lib/useUnsavedDraft'
export function CapturePage() {
  const [passage, setPassage] = useState(''),
    [answer, setAnswer] = useState(''),
    [review, setReview] = useState<Review>()
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [prompt, setPrompt] = useState('')
  const [, redraw] = useState(0),
    lock = useRef(false),
    errorRef = useRef<HTMLParagraphElement>(null),
    headingRef = useRef<HTMLHeadingElement>(null)
  useUnsavedDraft(!!(passage || answer || review))
  const change = () => redraw((n) => n + 1)
  const run = async (action: () => Promise<void>) => {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await action()
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not complete capture. Your draft is kept.',
      )
      setTimeout(() => errorRef.current?.focus(), 0)
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  const inspect = () =>
    run(async () => {
      const result = await resolveCapture(parseCapture(answer), passage, await readSurnameSetting())
      setReview(result)
      setTimeout(() => headingRef.current?.focus(), 0)
    })
  const { people, links } = reviewCounts(review)
  return (
    <main
      className="page mx-auto w-full max-w-md pb-28 pt-6"
      data-unsaved={!!(passage || answer || review) || undefined}
    >
      <h1 className="page-title">Smart capture</h1>
      <p className="mt-3">
        Copy and paste mode. Use fictional data only. Nothing is saved until you review and tap
        Save. No API key is needed.
      </p>
      <a className="flex min-h-12 items-center text-accent" href="#/add?form=1">
        Use the form instead
      </a>
      {error && (
        <p ref={errorRef} tabIndex={-1} role="alert" className="my-3 text-danger">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="my-3">
          {message}
        </p>
      )}
      <fieldset disabled={busy} className="min-w-0 space-y-4 mt-3">
        {!review && (
          <>
            <label className="block font-semibold">
              Tell me about someone
              <textarea
                aria-describedby="capture-count"
                className="mt-2 min-h-40 w-full rounded-2xl border bg-surface p-3 font-normal"
                maxLength={5000}
                value={passage}
                onChange={(e) => {
                  setPassage(e.target.value)
                  setPrompt('')
                }}
              />
            </label>
            <p id="capture-count">{passage.length} / 5,000 characters</p>
            <p className="rounded-2xl border p-3">{SHARING_NOTICE}</p>
            <Button
              disabled={!passage.trim()}
              onClick={() =>
                void run(async () => {
                  const text = buildPrompt(passage, await readSurnameSetting())
                  setPrompt(text)
                  try {
                    await navigator.clipboard.writeText(text)
                    setMessage(
                      'Prompt copied. Paste it into your chosen chatbot only if you agree to share the passage, then paste its JSON answer below.',
                    )
                  } catch {
                    setMessage(
                      'Clipboard access was unavailable. Select and copy the prompt below manually.',
                    )
                  }
                })
              }
            >
              Copy prompt
            </Button>
            {!!prompt && (
              <label className="block">
                Prompt to copy
                <textarea
                  className="min-h-40 w-full rounded-2xl border bg-surface p-3"
                  readOnly
                  value={prompt}
                  onFocus={(e) => e.target.select()}
                />
              </label>
            )}
            <label className="block">
              Paste the chatbot answer
              <textarea
                className="mt-2 min-h-40 w-full rounded-2xl border bg-surface p-3"
                maxLength={262144}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
              />
            </label>
            <Button disabled={!passage.trim() || !answer.trim()} onClick={() => void inspect()}>
              Read it
            </Button>
          </>
        )}
        {review && (
          <>
            <h2 ref={headingRef} tabIndex={-1} className="font-semibold">
              Review capture
            </h2>
            <p className="whitespace-pre-wrap break-words">Original passage: {review.passage}</p>
            <p>No records have been saved. Check identities, guesses and link directions.</p>
            {!!review.uncertain.length && (
              <div className="rounded-2xl bg-accent-soft p-3">
                <h3 className="font-semibold">Uncertain</h3>
                <ul>
                  {review.uncertain.map((text, i) => (
                    <li className="break-words" key={i}>
                      {text}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {review.people.map((row) => (
              <PersonReviewCard
                key={row.value.ref}
                row={row}
                change={change}
                allPeople={review.local.people}
              />
            ))}
            <ContextReview review={review} change={change} />
            <RelationshipReview review={review} change={change} />
            <Button variant="ghost" onClick={() => void inspect()}>
              Refresh review
            </Button>
            <p>Refresh re-reads the original answer and resets review choices.</p>
            <div className="sticky bottom-20 rounded-2xl border bg-surface p-3 space-y-2">
              <Button
                size="sm"
                className="w-full whitespace-normal py-2"
                disabled={!people}
                onClick={() =>
                  void run(async () => {
                    const id = await saveCapture(review)
                    setReview(undefined)
                    setPassage('')
                    setAnswer('')
                    setPrompt('')
                    setMessage('Capture saved. Undo is available in capture history below.')
                    showToast({
                      message: 'Capture saved',
                      duration: 10000,
                      action: {
                        label: 'Undo',
                        onClick: () =>
                          void run(async () => {
                            const result = await undoCapture(id)
                            setMessage(
                              result.undone
                                ? 'Capture undone.'
                                : 'Undo conflict: current data kept. Open capture history to review the protected changes.',
                            )
                            if (!result.undone) setError(result.conflicts.join(' '))
                          }),
                      },
                    })
                  })
                }
              >
                Save {people} people and {links} links
              </Button>
              <Button
                size="sm"
                className="w-full py-2"
                variant="secondary"
                onClick={() => {
                  setReview(undefined)
                  setMessage(
                    'Review discarded. No records changed. Your passage and answer are kept.',
                  )
                }}
              >
                Discard review
              </Button>
            </div>
          </>
        )}
        {!!(passage || answer) && (
          <Button
            variant="ghost"
            onClick={() => {
              setReview(undefined)
              setPassage('')
              setAnswer('')
              setPrompt('')
              setMessage('Draft discarded. No records changed.')
            }}
          >
            Discard draft
          </Button>
        )}
      </fieldset>
      {busy && <p role="status">Working locally…</p>}
      <CaptureHistory />
    </main>
  )
}
