import { useId, useRef, useState } from 'react'
import { IMAGE_FIELDS, TEXT_FIELDS, readImage, splitLines, youtubeId } from '../../utils/performanceMax.js'

export const inputClass = 'pmax-control'
export const buttonClass = 'pmax-button'
export const panelClass = 'pmax-card'

export function FieldError({ message, id }) {
  return message && <span id={id} className="pmax-field-error" role="alert">{message}</span>
}

export function RequiredMark() {
  return <span className="pmax-required" aria-hidden="true"> *</span>
}

export function Field({ label, value, onChange, error, hint, multiline, required, ...props }) {
  const Input = multiline ? 'textarea' : 'input'
  const id = useId()
  return <div className="pmax-field">
    <label htmlFor={id} className="pmax-label">{label}{required && <RequiredMark />}</label>
    <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} className={inputClass} aria-invalid={Boolean(error)}
      aria-required={required} aria-describedby={[hint && id + '-hint', error && id + '-error'].filter(Boolean).join(' ') || undefined} {...props} />
    {hint && <p className="pmax-hint" id={id + '-hint'}>{hint}</p>}
    <FieldError id={id + '-error'} message={error} />
  </div>
}

export function ImagePreviews({ images, remove, replace, busy }) {
  if (!images.length) return null
  return <ul className="pmax-thumbnails">
    {images.map((image, index) => <li key={index} className="pmax-thumbnail">
      <img src={image.source} alt={image.name} />
      <div className="pmax-thumbnail-meta">
        <span className="pmax-filename" title={image.name}>{image.name}</span>
        <span className="pmax-hint">{image.width} × {image.height} px</span>
        {remove && <div className="pmax-thumbnail-actions">
          <button type="button" className="pmax-text-button" disabled={busy} aria-label={'Replace ' + image.name} onClick={() => replace(index)}>Replace</button>
          <button type="button" className="pmax-text-button pmax-danger" disabled={busy} aria-label={'Remove ' + image.name} onClick={() => remove(index)}>Remove</button>
        </div>}
      </div>
    </li>)}
  </ul>
}

export function VideoPreviews({ urls, allowRemove }) {
  const [playing, setPlaying] = useState('')
  const videos = [...new Set(splitLines(urls).map(youtubeId).filter(Boolean))]
  if (!videos.length) return null
  return <ul className="pmax-videos">
    {videos.map((id) => <li key={id} className="pmax-video">
      {playing === id
        ? <iframe src={'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1'} title={'YouTube video ' + id} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
        : <button type="button" className="pmax-video-preview" onClick={() => setPlaying(id)}><span aria-hidden="true">▶</span> Preview {id}</button>}
      {allowRemove && <button type="button" className="pmax-text-button pmax-danger" aria-label={'Remove YouTube video ' + id} onClick={() => allowRemove(splitLines(urls).filter((line) => youtubeId(line) !== id).join('\n'))}>Remove video</button>}
    </li>)}
  </ul>
}

function ImagePicker({ field, images, onChange, error, onUpload }) {
  const [uploadError, setUploadError] = useState('')
  const [reading, setReading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const pending = useRef(false)
  const replacementInput = useRef(null)
  const replacementIndex = useRef(null)
  const id = useId()
  const [label, min, max, width, height, , aspect] = IMAGE_FIELDS[field]
  const canAdd = !reading && images.length < max
  const accept = 'image/jpeg,image/png,image/gif'

  // Chromium dispatches a cancel event from a file input when its picker is
  // dismissed. Keep that input-only event from reaching the enclosing dialog.
  function preserveWizardOnPickerCancel(event) {
    event.preventDefault()
    event.stopPropagation()
  }

  async function add(fileList, replaceIndex) {
    const files = Array.from(fileList || [])
    if (!files.length || pending.current) return
    setUploadError('')
    if (images.length + files.length - (replaceIndex === undefined ? 0 : 1) > max) {
      setUploadError('Add no more than ' + max + ' files.')
      return
    }
    pending.current = true
    setReading(true)
    onUpload(1)
    try {
      const incoming = []
      for (const file of files) incoming.push(await readImage(file, field))
      const combined = replaceIndex === undefined
        ? [...images, ...incoming]
        : images.map((image, index) => index === replaceIndex ? incoming[0] : image)
      if (new Set(combined.map((image) => image.source)).size !== combined.length) throw new Error('Remove duplicate images.')
      onChange(combined)
    } catch (problem) { setUploadError(problem.message) }
    finally {
      pending.current = false
      setReading(false)
      onUpload(-1)
    }
  }

  return <div className="pmax-upload">
    <div className="pmax-card-heading">
      <span id={id + '-label'} className="pmax-label">{label}{min > 0 && <RequiredMark />}</span>
      <span className="pmax-count" aria-label={images.length + ' of ' + max + ' used'}>{images.length}/{max}</span>
    </div>
    <p id={id + '-spec'} className="pmax-hint">{min ? 'At least ' + min + ' required. ' : 'Optional. '}{aspect} · {width} × {height} px minimum · JPG, PNG or GIF · 5 MB each</p>
    <label className="pmax-drop" data-dragging={dragging} data-disabled={!canAdd} htmlFor={id}
      onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = canAdd ? 'copy' : 'none'; if (canAdd) setDragging(true) }}
      onDragLeave={(event) => { if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setDragging(false) }}
      onDrop={(event) => { event.preventDefault(); setDragging(false); if (canAdd) add(event.dataTransfer.files) }}>
      <input id={id} className="pmax-file-input" type="file" accept={accept} multiple={max > 1} disabled={!canAdd}
        aria-labelledby={id + '-label'} aria-describedby={id + '-spec'} onChange={(event) => {
          add(event.currentTarget.files)
          event.currentTarget.value = ''
        }} onCancel={preserveWizardOnPickerCancel} />
      <span className="pmax-upload-icon" aria-hidden="true">↑</span>
      <span>{reading ? 'Checking images…' : canAdd ? <><strong>Choose images</strong><br /><span className="pmax-hint">or drag and drop here</span></> : 'Maximum reached'}</span>
    </label>
    <input ref={replacementInput} type="file" accept={accept} hidden disabled={reading} onChange={(event) => {
      if (replacementIndex.current !== null) add(event.currentTarget.files, replacementIndex.current)
      event.currentTarget.value = ''
    }} onCancel={preserveWizardOnPickerCancel} />
    {reading && <progress className="pmax-upload-progress" aria-label={'Checking ' + label.toLowerCase()} />}
    <FieldError message={uploadError || error} />
    <ImagePreviews images={images} busy={reading} remove={(index) => onChange(images.filter((_, i) => i !== index))}
      replace={(index) => { replacementIndex.current = index; replacementInput.current.click() }} />
  </div>
}

export function AssetGroupFields({ draft, groupKey, selectGroup, updateGroup, change, addGroup, removeGroup, errors, onUpload, uploading }) {
  const group = draft.groups.find((item) => item.key === groupKey) || draft.groups[0]
  const errorFor = (field) => errors[group.key + '.' + field]
  const changeGroup = (field) => (value) => updateGroup(group.key, field, value)
  return <div className="pmax-stack">
    <section className={panelClass}>
      <div className="pmax-section-title"><h5>Business identity</h5><p>Use your verified business or domain name. Up to five logos apply to every asset group.</p></div>
      <Field label="Business name" required value={draft.businessName} maxLength={25} onChange={(value) => change('businessName', value)} error={errors.businessName} />
      <div className="pmax-grid">
        {['logos', 'landscapeLogos'].map((field) => <ImagePicker key={field} field={field} images={draft[field]} onChange={(value) => change(field, value)} error={errors[field]} onUpload={onUpload} />)}
      </div>
    </section>
    <section className={panelClass}>
      <div className="pmax-group-controls">
        <label className="pmax-field"><span className="pmax-label">Asset group</span>
          <select className={inputClass} disabled={uploading} value={group.key} onChange={(event) => selectGroup(event.target.value)}>
            {draft.groups.map((item, index) => <option key={item.key} value={item.key}>{item.name || 'Asset group ' + (index + 1)}{Object.keys(errors).some((key) => key.startsWith(item.key + '.')) ? ' (needs attention)' : ''}</option>)}
          </select>
        </label>
        <div className="pmax-inline">
          <button type="button" className={buttonClass} disabled={uploading || draft.groups.length >= 100} onClick={addGroup}>Add asset group</button>
          {draft.groups.length > 1 && <button type="button" disabled={uploading} className="pmax-button pmax-danger" onClick={() => removeGroup(group.key)}>Remove group</button>}
        </div>
      </div>
      <div className="pmax-grid">
        <Field label="Asset group name" required value={group.name} maxLength={128} onChange={changeGroup('name')} error={errorFor('name')} />
        <Field label="Final URL" required type="url" value={group.finalUrl} onChange={changeGroup('finalUrl')} error={errorFor('finalUrl')} />
      </div>
    </section>
    <section className={panelClass} key={group.key + '-text'}>
      <h5>Ad copy</h5>
      {Object.entries(TEXT_FIELDS).map(([field, [label, min, max, limit]]) => <Field key={field} label={label} required
        hint={min + '–' + max + ' entries, one per line, up to ' + limit + ' characters each. Double-width characters count as two.' + (field === 'descriptions' ? ' Include a short description (60 characters or fewer) for compact placements.' : '')}
        value={group[field]} onChange={changeGroup(field)} error={errorFor(field)} multiline rows={Math.min(min + 1, 4)} />)}
    </section>
    <section className={panelClass} key={group.key + '-images'}>
      <h5>Campaign images</h5>
      <div className="pmax-grid">
        {['landscape', 'square', 'portrait'].map((field) => <ImagePicker key={field} field={field} images={group[field]} onChange={changeGroup(field)} error={errorFor(field)} onUpload={onUpload} />)}
      </div>
      <FieldError message={errors.images} />
    </section>
    <section className={panelClass} key={group.key + '-video'}>
      <div className="pmax-card-heading"><h5>YouTube videos</h5><span className="pmax-count">{new Set(splitLines(group.videos).map(youtubeId).filter(Boolean)).size}/15</span></div>
      <Field label="YouTube video URLs (optional)" placeholder="https://www.youtube.com/watch?v=…" hint="One URL per line. Use videos at least 10 seconds long in 16:9, 1:1 or 9:16. Google Ads checks eligibility when you create the campaign."
        value={group.videos} onChange={changeGroup('videos')} error={errorFor('videos')} multiline rows={2} />
      <VideoPreviews urls={group.videos} allowRemove={changeGroup('videos')} />
    </section>
  </div>
}
