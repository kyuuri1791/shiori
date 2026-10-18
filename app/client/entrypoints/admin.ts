document.addEventListener("submit", e => {
  const form = e.target
  if (form instanceof HTMLFormElement && form.dataset.confirm && !window.confirm(form.dataset.confirm)) e.preventDefault()
})
