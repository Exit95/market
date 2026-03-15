@echo off
mkdir "D:\ATRADER\Obsidian\Ebay_Michael"
mkdir "D:\ATRADER\Obsidian\Ebay_Michael\00_Inbox"
mkdir "D:\ATRADER\Obsidian\Ebay_Michael\10_MOC"
mkdir "D:\ATRADER\Obsidian\Ebay_Michael\20_Architecture"
mkdir "D:\ATRADER\Obsidian\Ebay_Michael\30_Decisions"
mkdir "D:\ATRADER\Obsidian\Ebay_Michael\40_Debug_Log"
mkdir "D:\ATRADER\Obsidian\Ebay_Michael\50_Patterns"
mkdir "D:\ATRADER\Obsidian\Ebay_Michael\60_Context"
mkdir "D:\ATRADER\Obsidian\Ebay_Michael\70_References"
mkdir "D:\ATRADER\Obsidian\Ebay_Michael\80_Archive"
xcopy /E /I /Y "D:\ATRADER\VSCODE\Skills\obsidian-knowledge-base\resources\templates" "D:\ATRADER\Obsidian\Ebay_Michael\_templates"
echo Obsidian setup complete.
