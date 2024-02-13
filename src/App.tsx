import { useSize } from "ahooks";
import { useCallback, useEffect, useRef, useState } from "react";
import parseTableSchema from "./TableParser";

const colorCycle = ["#f00", "#0f0"];

const colorMap: any = {};

type TableAttribute = (
  | {
      type: string;
    }
  | {
      ref: {
        table: string;
        attribute: string;
      };
    }
) & {
  name: string;
  optional: boolean;
  flags: string[];
  extra: {
    key: string;
    value: string;
  }[];
};

interface TableSchema {
  kind: "table";
  name: string;
  attributes: TableAttribute[];
}

function TableAttributeBlock({
  attribute,
  schema,
}: {
  attribute: TableAttribute;
  schema: TableSchema;
}) {
  return (
    <div
      id={`${schema.kind}.${schema.name}.${attribute.name}`}
      className="flex justify-between bg-slate-700 px-2 py-1 text-gray-300 odd:bg-slate-600"
    >
      <div className="mr-4">
        {attribute.name}
        {attribute.flags?.length ? (
          <small className="text-gray-400">
            {" "}
            ({attribute.flags.map((i) => i).join(",")})
          </small>
        ) : (
          ""
        )}
      </div>
      <div className="ml-4">
        {"type" in attribute
          ? attribute.type
          : `${attribute.ref.table}.${attribute.ref.attribute}`}
        {attribute.extra.length ? (
          <small className="text-gray-400">
            {" "}
            ({attribute.extra.map((i) => i.value).join(",")})
          </small>
        ) : (
          ""
        )}
      </div>
    </div>
  );
}

class MouseHandler {
  constructor() {
    window.addEventListener("mouseup", this.handleRelease.bind(this));
    window.addEventListener("blur", this.handleRelease.bind(this));

    window.addEventListener("mousemove", this.handleMove.bind(this));
  }

  currentElement: HTMLElement | null = null;

  backgroundUpdater: (() => void) | null = null;

  handleMove(ev: MouseEvent) {
    if (!this.currentElement) {
      return;
    }

    const currentElementRect = this.currentElement.getBoundingClientRect();
    this.currentElement.style.left = currentElementRect.x + ev.movementX + "px";
    this.currentElement.style.top = currentElementRect.y + ev.movementY + "px";

    if (this.backgroundUpdater) {
      this.backgroundUpdater();
    }
  }

  handleRelease() {
    if (!this.currentElement) {
      return;
    }

    this.currentElement = null;
  }

  setCurrentElement(ce: HTMLElement | null) {
    this.currentElement = ce;
  }

  setBackgroundUpdater(fn: () => void) {
    this.backgroundUpdater = fn;
  }
}

const mouseHandler = new MouseHandler();

function TableBlock({ schema }: { schema: TableSchema }) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapperRef.current;

    if (el) {
      const mousedownHandler = () => {
        mouseHandler.setCurrentElement(el);
      };

      el.addEventListener("mousedown", mousedownHandler);
      return () => {
        el?.removeEventListener("mousedown", mousedownHandler);
      };
    }
  }, []);

  return (
    <div
      className="table-block absolute z-10 font-mono hover:cursor-move"
      id={`${schema.kind}.${schema.name}`}
      ref={wrapperRef}
    >
      <div className="min-w-40 select-none overflow-hidden rounded-md border border-slate-900 text-sm shadow-md shadow-slate-800">
        <div className="bg-slate-800 px-2 py-1 font-bold text-gray-100">
          {schema.name}
        </div>
        <div>
          {schema.attributes.map((attr) => (
            <TableAttributeBlock
              key={`${schema.kind}.${schema.name}.${attr.name}`}
              schema={schema}
              attribute={attr}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface LineInfo {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
  table1: Rect;
  table2: Rect;
  attr1: Rect;
  attr2: Rect;
  color: string;
}

function GridAndLines({ schemas }: { schemas: TableSchema[] }) {
  const bodySize = useSize(window.document.body);
  const [lines, setLines] = useState<LineInfo[]>([]);

  const width = bodySize?.width || 0;
  const height = bodySize?.height || 0;

  const drawLines = useCallback(() => {
    const allRels = schemas
      .flatMap((i: any) =>
        i.attributes.map((j: any) => {
          return {
            ...j,
            schema: i,
          };
        }),
      )
      .filter((i) => "ref" in i);

    const lines: LineInfo[] = [];
    for (const i of allRels) {
      const fromTableId = `${i.schema.kind}.${i.schema.name}`;
      const toTableId = `table.${i.ref.table}`;
      const fromAttrId = `${i.schema.kind}.${i.schema.name}.${i.name}`;
      const toAttrId = `table.${i.ref.table}.${i.ref.attribute}`;

      const fromTable = document.getElementById(fromTableId);
      const toTable = document.getElementById(toTableId);
      const fromAttr = document.getElementById(fromAttrId);
      const toAttr = document.getElementById(toAttrId);
      if (fromAttr && toAttr && fromTable && toTable) {
        const fromTableRect = fromTable.getBoundingClientRect();
        const toTableRect = toTable.getBoundingClientRect();
        const fromAttrRect = fromAttr.getBoundingClientRect();
        const toAttrRect = toAttr.getBoundingClientRect();

        const pos = {
          x1: fromAttrRect.x + fromAttrRect.width,
          y1: fromAttrRect.y + fromAttrRect.height / 2,
          x2: toAttrRect.x,
          y2: toAttrRect.y + toAttrRect.height / 2,
          attr1: fromAttrRect,
          attr2: toAttrRect,
          table1: fromTableRect,
          table2: toTableRect,
          color: colorMap[i.ref.table],
        };

        lines.push(pos);
      }
    }

    setLines(lines);
  }, [schemas]);

  useEffect(() => {
    drawLines();
    mouseHandler.setBackgroundUpdater(drawLines);
  }, [drawLines]);

  const magic = 32;

  return (
    <>
      <svg
        className="pointer-events-none absolute z-0 h-screen w-screen"
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${width} ${height}`}
      >
        <defs>
          <pattern
            id="GridPattern"
            x="0"
            y="0"
            width="16"
            height="16"
            patternUnits="userSpaceOnUse"
          >
            <rect
              x="0"
              y="0"
              height="1"
              width="1"
              fill="none"
              stroke="#607a9f"
            />
          </pattern>
        </defs>
        <rect
          fill="url(#GridPattern)"
          stroke="black"
          width={width}
          height={height}
        />
        {lines.map((pos) => {
          const p: [number, number][] = [];

          p.push([pos.x1, pos.y1]); // start
          p.push([pos.x1 + magic, pos.y1]); // start padding

          // will cross back
          if (pos.x1 > pos.x2) {
            const destY = Math.max(
              pos.table1.y + pos.table1.height + magic,
              pos.table2.y + pos.table2.height + magic,
            );

            p.push([pos.x1 + magic, destY]);
            p.push([pos.x2 - magic, destY]);
          } else {
            p.push([pos.x2 - magic, pos.y1]);
          }

          p.push([pos.x2 - magic, pos.y2]);
          p.push([pos.x2, pos.y2]);

          return (
            <g
              strokeLinejoin="bevel"
              stroke={pos.color ?? "#fff"}
              strokeWidth={4}
              fill="none"
            >
              <polyline points={p.map((i) => i.join(",")).join(" ")} />
            </g>
          );
        })}
      </svg>
      <svg
        className="pointer-events-none absolute z-20 h-screen w-screen"
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${width} ${height}`}
      >
        {lines.map((pos) => {
          return (
            <g strokeLinejoin="bevel" stroke="none" fill={pos.color ?? "#fff"}>
              <rect x={pos.x1 - 3} y={pos.y1 - 4} width={6} height={10} />
              <rect x={pos.x2 - 3} y={pos.y2 - 4} width={6} height={10} />
            </g>
          );
        })}
      </svg>
    </>
  );
}

function App() {
  const data: TableSchema[] = parseTableSchema(`table User {
    id(PK): string
    name?: string "desc=姓名"
    meta?: json
  }

  table UserAuth {
    id(PK): number
    userId -> User.id
  }

  table UserToken {
    id(PK): number
    token: string
    userId -> User.id
    authId -> UserAuth.id
  }

  table Player {
    id(PK): number
    userId -> User.id
  }`);

  useEffect(() => {
    let lastX = 64;
    const lastY = 64;

    const orders = data.map((i) => i.name);
    for (const s of data) {
      const c = colorCycle.shift();
      colorCycle.push(c!);
      colorMap[s.name] = c;

      for (const a of s.attributes) {
        if ("ref" in a) {
          const refIndex = orders.findIndex((i) => i == a.ref.table);
          const selfIndex = orders.findIndex((i) => i == s.name);

          if (selfIndex > refIndex) {
            orders.splice(selfIndex, 1);
            orders.splice(Math.max(0, refIndex - 1), 0, s.name);
          }
        }
      }
    }

    for (const t of orders) {
      const el = document.getElementById(`table.${t}`) as HTMLDivElement;
      if (el) {
        const rect = el.getBoundingClientRect();

        el.style.top = `${lastY}px`;
        el.style.left = `${lastX}px`;

        lastX += rect.width + 64;
      }
    }

    mouseHandler.backgroundUpdater?.();
  }, [data]);

  return (
    <div className="flex min-h-screen bg-slate-700">
      {data.map((schema) => {
        return (
          <TableBlock key={`${schema.kind}.${schema.name}`} schema={schema} />
        );
      })}
      <GridAndLines schemas={data} />
    </div>
  );
}

export default App;
