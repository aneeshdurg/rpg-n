// TODO throw more stuff here

export function set_style(element, style) {
  for (var key of Object.keys(style)) {
    element.style[key] = style[key];
  }
}
