// TODO throw more stuff here

export function set_style(element, style) {
  for (var key of Object.keys(style)) {
    element.style[key] = style[key];
  }
}

// https://stackoverflow.com/a/2706236/5803067
export function eventFire(el, etype){
  if (el.fireEvent) {
    el.fireEvent('on' + etype);
  } else {
    var evObj = document.createEvent('Events');
    evObj.initEvent(etype, true, false);
    el.dispatchEvent(evObj);
  }
}
