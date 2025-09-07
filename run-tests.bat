@echo off
REM Run all tests for Vilokanam-view

echo Running tests for Vilokanam-view...

REM Run SDK tests
echo Running SDK tests...
cd frontend\packages\sdk
npm test

REM Run UI tests
echo Running UI tests...
cd ..\ui
npm test

echo All tests completed!