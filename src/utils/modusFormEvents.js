export const readInputString = (event) => {
  const target = event?.detail?.target;
  return target?.value ?? '';
};

export const readInputChecked = (event) => Boolean(event?.detail?.target?.checked);
