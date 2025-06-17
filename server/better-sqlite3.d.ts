// Type declarations for better-sqlite3
declare module 'better-sqlite3' {
  interface Statement {
    run(...params: any[]): { lastInsertRowid: number | bigint; changes: number };
    get(...params: any[]): any;
    all(...params: any[]): any[];
    iterate(...params: any[]): IterableIterator<any>;
  }

  interface Database {
    prepare(sql: string): Statement;
    exec(sql: string): void;
    transaction(fn: Function): Function;
    pragma(pragma: string, simplify?: boolean): any;
    function(name: string, func: Function): void;
    aggregate(name: string, options: { start?: any; step: Function; result?: Function }): void;
    loadExtension(path: string): void;
    close(): void;
    defaultSafeIntegers(toggleState?: boolean): Database;
    backup(destination: string | Database, options?: { attached?: string; progress?: (p: any) => void }): Promise<void>;
  }

  interface Options {
    readonly?: boolean;
    fileMustExist?: boolean;
    timeout?: number;
    verbose?: Function;
  }

  export default function(filename: string, options?: Options): Database;
}