export type AttributeType = "text" | "select" | "color" | "size";

export interface AttributeValueInput {
  code: string;                         // "BLACK", "XL"
  label?: Record<string, string>;       // { tr: "Siyah", en: "Black" }
  hex?: string;                         // "#000000"
  sort?: number;
  isActive?: boolean;
}

export interface CreateProductAttributeInput {
  code: string;                         // "COLOR"
  name: Record<string, string>;         // { tr: "Renk", en: "Color" }
  type?: AttributeType;                 // default "select"
  values?: AttributeValueInput[];
  isActive?: boolean;                   // default true
}

export interface UpdateProductAttributeInput {
  code?: string;
  name?: Record<string, string>;
  type?: AttributeType;
  values?: AttributeValueInput[];       // tamamını replace eder
  isActive?: boolean;
}

export interface AttributeListQuery {
  q?: string;                           // code, name[lang], values.code, values.label[lang]
  lang?: string;                        // default "tr"
  type?: AttributeType;
  isActive?: boolean;
  limit?: number;                       // default 200
  sort?: "code_asc" | "code_desc" | "created_desc" | "created_asc";
}
