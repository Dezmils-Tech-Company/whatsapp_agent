declare module 'qrcode-terminal' {
  function generate(text: string, options?: { small?: boolean }, cb?: (output: string) => void): void;
  export default { generate };
}
