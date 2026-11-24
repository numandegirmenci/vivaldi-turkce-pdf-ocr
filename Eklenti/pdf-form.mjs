export async function fillPdfForm(bytes, values, loadFont = async () => {
  const response = await fetch(chrome.runtime.getURL('vendor/NotoSans-Regular.ttf'));
  if (!response.ok) throw new Error('Türkçe karakter fontu yüklenemedi.');
  return response.arrayBuffer();
}) {
  const {PDFDocument, PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown, PDFOptionList} = globalThis.PDFLib;
  const document = await PDFDocument.load(bytes, {updateMetadata:false});
  const form = document.getForm();
  let font;
  for (const [name,value] of values) {
    const field = form.getField(name);
    if (field instanceof PDFTextField) {
      if (!font) {
        document.registerFontkit(globalThis.fontkit);
        font = await document.embedFont(await loadFont());
      }
      field.setText(value);
      field.updateAppearances(font);
      form.markFieldAsClean(field.ref);
    } else if (field instanceof PDFCheckBox) {
      if (value) field.check();
      else field.uncheck();
    } else if (field instanceof PDFRadioGroup || field instanceof PDFDropdown || field instanceof PDFOptionList) {
      if (value.length) field.select(value);
      else field.clear();
    } else {
      throw new Error('Desteklenmeyen form alanı: '+name);
    }
  }
  return document.save({addDefaultPage:false});
}

export function addPdfFormFields(view, annotations, values, onChange) {
  const {surface,viewport,index} = view;
  const document = surface.ownerDocument;
  const layer = document.createElement('div');
  layer.className = 'pdf-form-layer';
  for (const field of annotations) {
    const {fieldType,fieldName,rect,fieldValue,readOnly} = field;
    if (field.subtype !== 'Widget' || readOnly || field.hidden || !fieldName || !rect) continue;
    let control;
    if (fieldType === 'Tx') {
      control = document.createElement(field.multiLine ? 'textarea' : 'input');
      control.value = values.get(fieldName) ?? fieldValue ?? '';
      if (field.maxLen > 0) control.maxLength = field.maxLen;
    } else if (field.checkBox || field.radioButton) {
      control = document.createElement('input');
      control.type = field.radioButton ? 'radio' : 'checkbox';
      if (field.radioButton) control.name = fieldName;
      control.checked = field.radioButton
        ? (values.get(fieldName) ?? fieldValue) === field.buttonValue
        : (values.get(fieldName) ?? Boolean(fieldValue && fieldValue !== 'Off'));
    } else if (fieldType === 'Ch') {
      control = document.createElement('select');
      control.multiple = Boolean(field.multiSelect);
      const selected = values.get(fieldName) ?? fieldValue ?? [];
      if (!control.multiple) {
        const blank = document.createElement('option');
        blank.value = '';
        blank.textContent = '—';
        control.append(blank);
      }
      for (const item of field.options ?? []) {
        const option = document.createElement('option');
        option.value = item.exportValue;
        option.textContent = item.displayValue;
        option.selected = selected.includes(option.value);
        control.append(option);
      }
    } else continue;
    const [x1,y1,x2,y2] = viewport.convertToViewportRectangle(rect);
    control.style.left = Math.min(x1,x2)+'px';
    control.style.top = Math.min(y1,y2)+'px';
    control.style.width = Math.abs(x2-x1)+'px';
    control.style.height = Math.abs(y2-y1)+'px';
    control.style.fontSize = Math.max(8,Math.min(24,Math.abs(y2-y1)*0.64))+'px';
    control.setAttribute('aria-label',field.alternativeText || fieldName || 'Sayfa '+index+' form alanı');
    control.title = field.alternativeText || fieldName;
    control.addEventListener('input',() => {
      if (field.radioButton && !control.checked) return;
      const value = control.multiple ? Array.from(control.selectedOptions, option=>option.value)
        : field.radioButton ? field.buttonValue : field.checkBox ? control.checked : control.value;
      values.set(fieldName,value);
      onChange();
    });
    layer.append(control);
  }
  surface.append(layer);
  return layer.childElementCount;
}
