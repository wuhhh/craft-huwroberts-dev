function slideoverPreUpdate(detail = {}) {
  const preUpdateEvent = new CustomEvent('slideover-pre-update', {
    detail,
  });

  window.dispatchEvent(preUpdateEvent);
}

function slideoverPostUpdate(detail = {}) {
  const postUpdateEvent = new CustomEvent('slideover-post-update', {
    detail,
  });

  window.dispatchEvent(postUpdateEvent);
}

export { slideoverPreUpdate, slideoverPostUpdate };
