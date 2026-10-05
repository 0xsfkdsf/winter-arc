/// <reference types="vite/client" />
declare module '*.wasm?url' { const src: string; export default src; }
declare module 'sql.js' { const initSqlJs: any; export default initSqlJs; }
