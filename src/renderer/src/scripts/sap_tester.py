#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import win32com.client
import sys
import time
import json
from typing import Dict, List, Tuple

class SAPTester:
    """Testador automático de código ABAP via SAP GUI Scripting"""

    def __init__(self):
        self.session = None
        self.connected = False

    def connect(self) -> Tuple[bool, str]:
        """
        Conecta ao SAP GUI

        Returns:
            Tupla (sucesso, mensagem)
        """
        try:
            sap_gui_auto = win32com.client.GetObject("SAPGUI")
            application = sap_gui_auto.GetScriptingEngine

            if application.Children.Count == 0:
                return False, "Nenhuma conexão SAP ativa encontrada"

            connection = application.Children(0)
            self.session = connection.Children(0)
            self.connected = True

            return True, "Conectado ao SAP GUI com sucesso"

        except Exception as e:
            return False, f"Erro ao conectar ao SAP GUI: {str(e)}"

    def create_program(self, nome_programa: str, titulo: str = "") -> Tuple[bool, str]:
        """
        Cria ou reabre um programa ABAP no SE38 em modo de edição.
        Se o programa já existir, apenas o abre para edição (sem recriar).

        Args:
            nome_programa: Nome do programa (ex: ZTEST_001)
            titulo: Título do programa (usado apenas na criação)

        Returns:
            Tupla (sucesso, mensagem)
        """
        try:
            if not self.connected:
                return False, "Não conectado ao SAP"

            # Navega para SE38
            self.session.findById("wnd[0]").maximize()
            self.session.findById("wnd[0]/tbar[0]/okcd").text = "/nse38"
            self.session.findById("wnd[0]").sendVKey(0)
            time.sleep(0.5)

            # Informa nome do programa e pressiona Enter
            self.session.findById("wnd[0]/usr/ctxtRS38M-PROGRAMM").text = nome_programa
            self.session.findById("wnd[0]").sendVKey(0)
            time.sleep(0.5)

            # ── Detecta se editor já está aberto (programa existe em display) ──
            editor_aberto = False
            try:
                self.session.findById("wnd[0]/usr/cntlEDITOR/shellcont/shell")
                editor_aberto = True
            except Exception:
                editor_aberto = False

            if editor_aberto:
                # Programa já aberto em display → switch para edit (Ctrl+F1 = VKey 50)
                try:
                    self.session.findById("wnd[0]").sendVKey(50)
                    time.sleep(0.5)
                except Exception:
                    pass
                return True, f"Programa {nome_programa} reaberto em modo edição"

            # ── Tenta clicar em Criar (btnNEW) ─────────────────────────────────
            try:
                self.session.findById("wnd[0]/usr/btnNEW").press()
                time.sleep(0.5)
            except Exception:
                # btnNEW não encontrado — tenta abrir em edição diretamente
                try:
                    self.session.findById("wnd[0]").sendVKey(50)
                    time.sleep(0.5)
                except Exception:
                    pass
                return True, f"Programa {nome_programa} aberto"

            # ── Verifica se apareceu popup "já existe" ─────────────────────────
            programa_existente = False
            try:
                wnd1_text = self.session.findById("wnd[1]").text or ""
                if "exist" in wnd1_text.lower() or "existe" in wnd1_text.lower():
                    programa_existente = True
            except Exception:
                pass

            if programa_existente:
                # Fecha popup (Enter ou ESC) e abre em modo edição
                try:
                    self.session.findById("wnd[1]").sendVKey(0)   # Enter
                    time.sleep(0.3)
                except Exception:
                    try:
                        self.session.findById("wnd[1]/tbar[0]/btn[12]").press()  # Cancel
                        time.sleep(0.3)
                    except Exception:
                        pass
                # Agora tenta abrir em edit
                try:
                    self.session.findById("wnd[0]").sendVKey(50)  # Ctrl+F1 = Modificar
                    time.sleep(0.5)
                except Exception:
                    pass
                return True, f"Programa {nome_programa} já existe — reaberto em modo edição"

            # ── Fluxo normal de criação: preenche atributos ────────────────────
            titulo_final = titulo if titulo else f"Gerado por ABAPFY - {nome_programa}"
            self.session.findById("wnd[1]/usr/txtRS38M-REPTI").text = titulo_final
            self.session.findById("wnd[1]/usr/cmbTRDIR-SUBC").setFocus()
            self.session.findById("wnd[1]/usr/cmbTRDIR-SUBC").key = "1"  # Programa executável
            self.session.findById("wnd[1]/tbar[0]/btn[0]").press()
            time.sleep(0.3)

            # Grava como objeto local
            self.session.findById("wnd[2]/tbar[0]/btn[7]").press()
            time.sleep(1)

            return True, f"Programa {nome_programa} criado com sucesso"

        except Exception as e:
            return False, f"Erro ao criar/abrir programa: {str(e)}"

    def insert_code(self, codigo: str, linha_inicial: int = 1) -> Tuple[bool, str]:
        """
        Insere código no editor ABAP

        Args:
            codigo: Código ABAP a ser inserido
            linha_inicial: Linha inicial para inserção (padrão: 1)

        Returns:
            Tupla (sucesso, mensagem)
        """
        try:
            if not self.connected:
                return False, "Não conectado ao SAP"

            # Aguarda editor carregar
            time.sleep(1)

            # Localiza o editor
            editor = self.session.findById("wnd[0]/usr/cntlEDITOR/shellcont/shell")

            # CRÍTICO: Remove o template padrão do SAP antes de inserir código
            # Seleciona todo o conteúdo existente e deleta
            editor.selectAll()
            editor.deleteSelection()

            # Aguarda a limpeza
            time.sleep(0.5)

            # Prepara código (converte quebras de linha)
            codigo_formatado = codigo.replace('\n', '\r\n')

            # Insere código a partir da linha 1
            editor.insertText(codigo_formatado, linha_inicial, 1)

            return True, "Código inserido com sucesso"

        except Exception as e:
            return False, f"Erro ao inserir código: {str(e)}"

    def check_syntax(self) -> Tuple[bool, List[Dict], str]:
        """
        Verifica sintaxe do código e captura erros

        Returns:
            Tupla (sucesso, lista_erros, mensagem)
        """
        try:
            if not self.connected:
                return False, [], "Não conectado ao SAP"

            # Clica no botão de verificar sintaxe
            self.session.findById("wnd[0]/tbar[1]/btn[26]").press()
            time.sleep(1.5)

            erros = []

            try:
                # Tenta capturar grid de erros
                grid_id = "wnd[0]/shellcont/shell/shellcont[0]/shell/shellcont[0]/shell"
                grid_erros = self.session.findById(grid_id)

                row_count = grid_erros.rowCount

                if row_count > 0:
                    # Captura todos os erros
                    for i in range(row_count):
                        erro = {
                            'linha': str(grid_erros.getCellValue(i, "LINE")),
                            'tipo': str(grid_erros.getCellValue(i, "MSGTYPE")),
                            'texto': str(grid_erros.getCellValue(i, "TEXT"))
                        }
                        erros.append(erro)

                    # Fecha o painel de erros
                    grid_erros.pressToolbarButton("WB_END")

                    return False, erros, f"{len(erros)} erro(s) de sintaxe encontrado(s)"

                else:
                    # Sem erros - fecha painel
                    try:
                        grid_erros.pressToolbarButton("WB_END")
                    except:
                        pass

                    return True, [], "Sintaxe válida - nenhum erro encontrado"

            except Exception as e_grid:
                # Grid não apareceu = sem erros
                return True, [], "Sintaxe válida (grid não exibido)"

        except Exception as e:
            return False, [], f"Erro ao verificar sintaxe: {str(e)}"

    def test_program(self, nome_programa: str, codigo: str, titulo: str = "") -> Dict:
        """
        Testa completamente um programa ABAP

        Args:
            nome_programa: Nome do programa
            codigo: Código ABAP
            titulo: Título do programa

        Returns:
            Dict com resultado do teste
        """
        resultado = {
            'sucesso': False,
            'programa': nome_programa,
            'etapas': {},
            'erros': [],
            'mensagem': ''
        }

        # 1. Conectar ao SAP
        sucesso, msg = self.connect()
        resultado['etapas']['conexao'] = {'sucesso': sucesso, 'mensagem': msg}
        if not sucesso:
            resultado['mensagem'] = msg
            return resultado

        # 2. Criar programa
        sucesso, msg = self.create_program(nome_programa, titulo)
        resultado['etapas']['criacao'] = {'sucesso': sucesso, 'mensagem': msg}
        if not sucesso:
            resultado['mensagem'] = msg
            return resultado

        # 3. Inserir código
        sucesso, msg = self.insert_code(codigo)
        resultado['etapas']['insercao'] = {'sucesso': sucesso, 'mensagem': msg}
        if not sucesso:
            resultado['mensagem'] = msg
            return resultado

        # 4. Verificar sintaxe
        sucesso, erros, msg = self.check_syntax()
        resultado['etapas']['validacao'] = {'sucesso': sucesso, 'mensagem': msg}
        resultado['erros'] = erros

        if sucesso:
            resultado['sucesso'] = True
            resultado['mensagem'] = "Programa testado com sucesso - sem erros de sintaxe"
        else:
            resultado['mensagem'] = f"Programa criado mas contém {len(erros)} erro(s) de sintaxe"

        return resultado

    def close(self):
        """Fecha conexão"""
        self.session = None
        self.connected = False


def assemble_from_files(files: list) -> Tuple[str, str]:
    """
    Monta o programa completo a partir de um array de arquivos gerados pela IA.
    Substitui as instruções INCLUDE pelo conteúdo real dos includes.

    Args:
        files: Lista de dicts com {name, type, content, ...}

    Returns:
        Tupla (nome_programa, codigo_montado)
    """
    import re as _re

    # Encontra o arquivo principal (tipo PROG ou com statement REPORT)
    main_file = None
    for f in files:
        if f.get('type', '').upper() in ('PROG', 'REPORT', 'PROGRAM'):
            main_file = f
            break

    if not main_file:
        for f in files:
            content = f.get('content', '')
            if _re.search(r'^\s*REPORT\s+\w+', content, _re.IGNORECASE | _re.MULTILINE):
                main_file = f
                break

    if not main_file and files:
        main_file = files[0]

    if not main_file:
        return 'ZPROGRAM', ''

    # Mapa de includes: {NOME_UPPER: content}
    include_map = {}
    for f in files:
        if f.get('name', '').upper() != main_file.get('name', '').upper():
            include_map[f['name'].upper()] = f.get('content', '')

    # Substitui INCLUDE X. pelo conteúdo inline
    content = main_file.get('content', '')

    def replace_include(match):
        inc_name = match.group(1).upper()
        if inc_name in include_map:
            sep = '*' + '=' * 58
            return (
                f"{sep}\n"
                f"* INCLUDE: {inc_name} (montado inline)\n"
                f"{sep}\n"
                f"{include_map[inc_name]}\n"
                f"{sep}\n"
                f"* FIM INCLUDE: {inc_name}\n"
                f"{sep}"
            )
        return match.group(0)

    assembled = _re.sub(
        r'^\s*INCLUDE\s+(\w+)\s*\.\s*$',
        replace_include,
        content,
        flags=_re.IGNORECASE | _re.MULTILINE
    )

    nome_programa = main_file.get('name', 'ZPROGRAM')
    return nome_programa, assembled


def test_code_from_file(filepath: str, nome_programa: str = None) -> Dict:
    """
    Testa código ABAP de um arquivo

    Args:
        filepath: Caminho do arquivo .abap
        nome_programa: Nome do programa (se None, extrai do arquivo)

    Returns:
        Dict com resultado do teste
    """
    try:
        # Lê o arquivo
        with open(filepath, 'r', encoding='utf-8') as f:
            codigo = f.read()

        # Extrai nome do programa se não fornecido
        if not nome_programa:
            import re
            match = re.search(r'REPORT\s+(\w+)', codigo, re.IGNORECASE)
            if match:
                nome_programa = match.group(1)
            else:
                # Usa nome do arquivo
                import os
                nome_programa = os.path.splitext(os.path.basename(filepath))[0]

        # Testa
        tester = SAPTester()
        resultado = tester.test_program(nome_programa, codigo)
        tester.close()

        return resultado

    except Exception as e:
        return {
            'sucesso': False,
            'programa': nome_programa or 'desconhecido',
            'etapas': {},
            'erros': [],
            'mensagem': f"Erro ao processar arquivo: {str(e)}"
        }


def main():
    """Função principal para uso via linha de comando"""
    if len(sys.argv) < 2:
        print("Uso: python sap_tester.py <arquivo.abap> [nome_programa]")
        print("     python sap_tester.py --json <arquivo.json>")
        sys.exit(1)

    # ── Modo JSON: recebe array de arquivos gerados pela IA ──────────────────
    if sys.argv[1] == '--json':
        if len(sys.argv) < 3:
            print("Erro: informe o caminho do arquivo JSON")
            sys.exit(1)

        json_path = sys.argv[2]
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except Exception as e:
            print(json.dumps({'sucesso': False, 'mensagem': f'Erro ao ler JSON: {str(e)}',
                              'programa': '', 'etapas': {}, 'erros': []}, ensure_ascii=False))
            sys.exit(1)

        files = data.get('files', [])
        program_name_override = data.get('programName', '')

        if not files:
            print(json.dumps({'sucesso': False, 'mensagem': 'Nenhum arquivo informado',
                              'programa': '', 'etapas': {}, 'erros': []}, ensure_ascii=False))
            sys.exit(1)

        nome_programa, codigo = assemble_from_files(files)
        if program_name_override:
            nome_programa = program_name_override.upper()

        tester = SAPTester()
        resultado = tester.test_program(nome_programa, codigo)
        tester.close()

        print(json.dumps(resultado, indent=2, ensure_ascii=False))
        sys.exit(0 if resultado['sucesso'] else 1)

    # ── Modo arquivo: recebe caminho de arquivo .abap ────────────────────────
    filepath = sys.argv[1]
    nome_programa = sys.argv[2] if len(sys.argv) > 2 else None

    print(f"\n{'='*60}")
    print("ABAPFY - SAP Tester")
    print(f"{'='*60}\n")

    resultado = test_code_from_file(filepath, nome_programa)

    # Exibe resultado
    print(f"Programa: {resultado['programa']}")
    print(f"Status: {'✓ SUCESSO' if resultado['sucesso'] else '✗ FALHA'}")
    print(f"Mensagem: {resultado['mensagem']}\n")

    # Exibe etapas
    if resultado['etapas']:
        print("Etapas:")
        for nome, etapa in resultado['etapas'].items():
            status = '✓' if etapa['sucesso'] else '✗'
            print(f"  {status} {nome.capitalize()}: {etapa['mensagem']}")
        print()

    # Exibe erros
    if resultado['erros']:
        print(f"Erros de Sintaxe ({len(resultado['erros'])}):")
        for erro in resultado['erros']:
            print(f"  [{erro['tipo']}] Linha {erro['linha']}: {erro['texto']}")
        print()

    # Retorna JSON para integração
    print("\nJSON Output:")
    print(json.dumps(resultado, indent=2, ensure_ascii=False))

    sys.exit(0 if resultado['sucesso'] else 1)


if __name__ == "__main__":
    main()
