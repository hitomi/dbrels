Schema
  = Block|..,_|

Block
  = kind:Table __ name:Name _ "{" _ list:List _ "}" { return { kind, name, attributes: list } }

List
  = Column|..,Space LineBreak Space|

Column
  = key:Name fg:(Space fg:FlagGroup Space { return fg })? _ opt:"?"? _ ":" _ value:Name str:(HardSpace str:StrOpts {return str})? { return { name: key, type: value, optional: !!opt, flags: fg, extra: str || [] } }
  / key:Name fg:(Space fg:FlagGroup Space { return fg })? _ opt:"?"? _ Arrow _ table:Name "." attribute:Name str:(HardSpace str:StrOpts {return str})? { return { name: key, ref: { table, attribute }, optional: !!opt, flags: fg, extra: str || [] } }

FlagGroup
  = "(" f:Flags|..,Space "," Space| ")" { return f }

Flags
  = Name

StrOpts
  = "\"" kv:KVPair|..,","| "\"" { return kv }

KVPair
  = k:Name "=" v:ExC { return { key: k, value: v } }

ExC
  = s:[^,"=]* { return s.join('') }

Name
  = h:[a-zA-Z_]r:[a-zA-Z0-9_]* { return [h, ...r].join('') }

Keyword "keyword"
  = Table

Table "table"
  = "table"

Arrow
  = "->"

__
  = [ \t\n\r]+

LineBreak
  = [\n\r]+ { return }

HardSpace
  = [ \t]+

Space
  = [ \t]*

_ "whitespace"
  = [ \t\n\r]* { return }