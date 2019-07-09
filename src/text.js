// This module contains methods to help a scene format text
//
// TODO create elements that allow text to be displayed on the display instead
// of the textbox
export function with_color(color, text) {
  return "<span style=\"color:" + color + "\">" + text + "</span>";
}

export function right_align(text) {
  return "<p align=right>" + text + "</p>";
}

export function center_align(text) {
  return "<p align=center>" + text + "</p>";
}
