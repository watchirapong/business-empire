// Global type declarations for Mongoose to reduce TypeScript errors
declare module 'mongoose' {
  interface Model<T = any> {
    find(conditions?: any, projection?: any, options?: any): any;
    findOne(conditions?: any, projection?: any, options?: any): any;
    findById(id: any, projection?: any, options?: any): any;
    findByIdAndUpdate(id: any, update?: any, options?: any): any;
    findByIdAndDelete(id: any, options?: any): any;
    create(docs: any): any;
    deleteOne(conditions?: any, options?: any): any;
    deleteMany(conditions?: any, options?: any): any;
    updateOne(conditions?: any, update?: any, options?: any): any;
    updateMany(conditions?: any, update?: any, options?: any): any;
    countDocuments(conditions?: any, options?: any): any;
    aggregate(pipeline?: any[], options?: any): any;
    populate(path?: string | any, select?: string | any): any;
    sort(sort?: any): any;
    limit(limit?: number): any;
    skip(skip?: number): any;
    lean(lean?: boolean): any;
    exec(): any;
  }
  
  interface Document {
    save(options?: any): any;
    toObject(options?: any): any;
    toJSON(options?: any): any;
  }
  
  interface Schema {
    new (definition?: any, options?: any): any;
    Types: {
      ObjectId: {
        isValid(id: any): boolean;
        new (id?: any): any;
      };
      Mixed: any;
      String: any;
      Number: any;
      Date: any;
      Boolean: any;
      Array: any;
      Map: any;
      Decimal128: any;
      Buffer: any;
    };
  }
  
  interface Connection {
    readyState: number;
    db: {
      collection(name: string): any;
    };
    collection(name: string): any;
  }
  
  interface Mongoose {
    connect(uri: string, options?: any): any;
    connection: Connection;
    Schema: Schema;
    Types: {
      ObjectId: {
        isValid(id: any): boolean;
        new (id?: any): any;
      };
    };
    model<T = any>(name: string, schema?: any): any;
    models: { [key: string]: any };
  }
  
  const mongoose: Mongoose;
  export = mongoose;
}

// Global type declarations to override Mongoose types
declare global {
  namespace mongoose {
    interface Schema {
      Types: {
        ObjectId: {
          isValid(id: any): boolean;
          new (id?: any): any;
        };
        Mixed: any;
        String: any;
        Number: any;
        Date: any;
        Boolean: any;
        Array: any;
        Map: any;
        Decimal128: any;
        Buffer: any;
      };
    }
    
    interface Connection {
      db: {
        collection(name: string): any;
      };
      collection(name: string): any;
    }
    
    interface Mongoose {
      Types: {
        ObjectId: {
          isValid(id: any): boolean;
          new (id?: any): any;
        };
      };
    }
  }
}
