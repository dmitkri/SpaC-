CXX = clang++
CXXFLAGS = -std=c++11 -Wall
TARGET = spa_server
SOURCES = main.cpp utils.cpp spa_manager.cpp server.cpp
SDK_PATH = /Library/Developer/CommandLineTools/SDKs/MacOSX26.0.sdk
INCLUDE_PATH = $(SDK_PATH)/usr/include/c++/v1

# Компиляция
all: $(TARGET)

$(TARGET): $(SOURCES)
	$(CXX) $(CXXFLAGS) -isysroot $(SDK_PATH) -I$(INCLUDE_PATH) -o $(TARGET) $(SOURCES) -lsqlite3

# Запуск
run: $(TARGET)
	./$(TARGET)

clean:
	rm -f $(TARGET)

help:
	@echo "Доступные команды:"
	@echo "  make        - скомпилировать программу"
	@echo "  make run    - скомпилировать и запустить"
	@echo "  make clean  - удалить скомпилированный файл"

.PHONY: all run clean help
