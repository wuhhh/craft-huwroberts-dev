export default ("core",
() => ({
  wrapKeyDown(event, fn) {
    const focused = this.$focus.focused();
    const priority = focused ? focused.dataset.keydownPriority : null;

    if (priority) {
      let priorities = priority.split(",");
      if (priorities.includes(event.key)) {
        event.preventDefault();
      }
    }
    else {
      fn();
    }
  }
}));
