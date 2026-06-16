@echo off
setlocal
cd /d %~dp0server
if not exist .env copy .env.example .env
if not exist node_modules npm install
npm run dev
