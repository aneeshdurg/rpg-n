// This module contains methods to help a scene format text
//
// TODO create elements that allow text to be displayed on the display instead
// of the textbox

import {config} from './config.js';

export function with_color(color, text) {
  return "<span style=\"color:" + color + "\">" + text + "</span>";
}

export function right_align(text) {
  return "<p align=right>" + text + "</p>";
}

export function center_align(text) {
  return "<p align=center>" + text + "</p>";
}

export class Text {
  constructor(contents) {
    this.color = null;
    this.typespeed = config.typespeed;
    this.alignment = "left";
    if (contents)
      this.contents(contents);

    this.has_next = false;
    this.next_delay = null;
    this.next = null;
  }

  align(alignment) {
    const valid_alignments = ["center", "right", "left"];
    if (valid_alignments.indexOf(alignment) < 0)
      throw new Error("Alignment must be in '" + valid_alignments + "'");

    this.alignment = alignment;
    return this;
  }

  color(col) {
    this.color = col;
    return this;
  }

  contents(text) {
    this.contents = text
    return this;
  }

  speed(s) {
    this.typespeed = s;
    return this;
  }

  andThen(text, delay) {
    if (!(text instanceof Text) && typeof(text) != 'string') {
      throw new Error("Expected instance of Text or string");
    }

    this.has_next = true;
    this.next_delay = delay || 0;
    if (typeof(text) == 'string')
      this.next = new Text(text);
    else
      this.next = text;

    return this;
  }

  render() {
    var result = ["<p align=" + this.align + ">", this.contents, "</p>"];
    if (this.color) {
      result.unshift("<span style=\"color:" + this.color + "\">");
      result.push("</span>");
    }

    if (this.has_next) {
      result.push("^" + this.next_delay);
      result.push(this.next.render());
    }

    return result.join("");
  }
}
