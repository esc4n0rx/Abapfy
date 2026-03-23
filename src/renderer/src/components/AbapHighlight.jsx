import React, { useMemo } from 'react'

// ─── ABAP keyword list ──────────────────────────────────────────────────────
const KEYWORDS = [
  'REPORT','PROGRAM','FUNCTION-POOL','CLASS-POOL','INTERFACE-POOL',
  'DATA','TYPES','CONSTANTS','FIELD-SYMBOLS','CLASS-DATA','STATICS',
  'PARAMETERS','SELECT-OPTIONS','RANGES',
  'CLASS','ENDCLASS','INTERFACE','ENDINTERFACE','METHOD','ENDMETHOD',
  'IMPLEMENTATION','DEFINITION','PUBLIC','PRIVATE','PROTECTED','SECTION',
  'INHERITING','IMPLEMENTING','ABSTRACT','FINAL','REDEFINITION',
  'CREATE OBJECT','NEW',
  'IF','ELSE','ELSEIF','ENDIF','CASE','WHEN','ENDCASE','OTHERS',
  'DO','ENDDO','TIMES','WHILE','ENDWHILE',
  'LOOP','AT','ENDAT','ENDLOOP',
  'CHECK','EXIT','RETURN','STOP','CONTINUE',
  'SELECT','ENDSELECT','FROM','WHERE','AND','OR','NOT',
  'INTO','TABLE','SINGLE','CORRESPONDING FIELDS OF',
  'INNER JOIN','LEFT OUTER JOIN','LEFT JOIN','RIGHT JOIN',
  'ORDER BY','GROUP BY','HAVING','DISTINCT','ASCENDING','DESCENDING',
  'UP TO','ROWS','FOR ALL ENTRIES',
  'INSERT','UPDATE','MODIFY','DELETE',
  'COMMIT WORK','ROLLBACK WORK',
  'OPEN CURSOR','FETCH','CLOSE CURSOR',
  'FUNCTION','ENDFUNCTION','FORM','ENDFORM',
  'PERFORM','USING','CHANGING','TABLES',
  'CALL FUNCTION','CALL METHOD','CALL SCREEN','CALL TRANSACTION',
  'EXPORTING','IMPORTING','RECEIVING','EXCEPTIONS',
  'MODULE','ENDMODULE','INPUT','OUTPUT',
  'TRY','CATCH','CLEANUP','ENDTRY','RAISE','THROW','RESUMABLE',
  'WRITE','MOVE','CLEAR','FREE','REFRESH','UNASSIGN',
  'APPEND','COLLECT','CONCATENATE','SPLIT','REPLACE',
  'SHIFT','CONDENSE','TRANSLATE','FIND','SEARCH',
  'READ TABLE','SORT','DESCRIBE TABLE',
  'MESSAGE','AUTHORITY-CHECK','SUBMIT','VIA',
  'GET','SET','ME','SUPER','CAST',
  'IS BOUND','IS INITIAL','IS SUPPLIED','IS REQUESTED',
  'LIKE','TYPE','REF TO','OF',
  'LENGTH','DECIMALS','OCCURS','VALUE','INITIAL',
  'BEGINS WITH','BETWEEN','IN',
  'EQ','NE','LT','GT','LE','GE','CO','CA','CS','CP',
  'ABAP_TRUE','ABAP_FALSE','TRUE','FALSE',
  'ASSIGN','WITH KEY','RESULT','TRANSPORTING','BINARY SEARCH',
  'INDEX','COMPARING',
]

const SORTED_KW = [...new Set(KEYWORDS)].sort((a, b) => b.length - a.length)

// ─── Tokenizer ──────────────────────────────────────────────────────────────
function tokenizeLine(line) {
  if (/^\*/.test(line)) return [{ t: 'comment', v: line }]

  const tokens = []
  let i = 0
  const up = line.toUpperCase()

  const push = (t, v) => {
    const last = tokens[tokens.length - 1]
    if (t === 'plain' && last?.t === 'plain') { last.v += v; return }
    tokens.push({ t, v })
  }

  while (i < line.length) {
    const ch = line[i]

    // inline comment "
    if (ch === '"') { push('comment', line.slice(i)); break }

    // string literal ''
    if (ch === "'") {
      let j = i + 1
      while (j < line.length && line[j] !== "'") j++
      push('string', line.slice(i, j + 1))
      i = j + 1; continue
    }

    // number (only when preceded by non-word char)
    if (/\d/.test(ch) && (i === 0 || /\W/.test(line[i - 1]))) {
      let j = i
      while (j < line.length && /[\d.]/.test(line[j])) j++
      if (j > i) { push('number', line.slice(i, j)); i = j; continue }
    }

    // keyword (case-insensitive, whole-word boundary)
    let matched = false
    if (/[A-Z_]/i.test(ch)) {
      for (const kw of SORTED_KW) {
        if (up.startsWith(kw, i)) {
          const after = line[i + kw.length]
          const before = i > 0 ? line[i - 1] : ' '
          if ((!after || /[\s.,;:()\[\]"']/.test(after)) && /[\s.,;:()\[\]"']/.test(before || ' ')) {
            push('keyword', line.slice(i, i + kw.length))
            i += kw.length; matched = true; break
          }
        }
      }
    }

    if (!matched) { push('plain', ch); i++ }
  }

  return tokens
}

const COLORS = {
  keyword: 'var(--hl-keyword, #4d9ef7)',
  string:  'var(--hl-string,  #3fb950)',
  comment: 'var(--hl-comment, #8b949e)',
  number:  'var(--hl-number,  #f78166)',
  plain:   'inherit',
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function AbapHighlight({ code, maxHeight = 320 }) {
  const lines = useMemo(() => {
    if (!code) return []
    return code.split('\n').map((line, idx) => ({ idx, tokens: tokenizeLine(line) }))
  }, [code])

  return (
    <pre style={{
      margin: 0, padding: '12px 16px',
      fontFamily: '"Cascadia Code","Consolas","Courier New",monospace',
      fontSize: 12, lineHeight: 1.65,
      background: 'var(--sap-base)', color: 'var(--sap-text)',
      overflowX: 'auto', overflowY: 'auto',
      maxHeight, whiteSpace: 'pre', tabSize: 2
    }}>
      {lines.map(({ idx, tokens }) => (
        <span key={idx} style={{ display: 'block' }}>
          {tokens.length === 0
            ? '\u200B'
            : tokens.map((tok, ti) => (
              <span key={ti} style={{ color: COLORS[tok.t] ?? 'inherit' }}>{tok.v}</span>
            ))
          }
        </span>
      ))}
    </pre>
  )
}
