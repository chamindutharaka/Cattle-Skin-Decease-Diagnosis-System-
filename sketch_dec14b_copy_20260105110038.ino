#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include "DHT.h"
#include "MAX30100_PulseOximeter.h"

// ---------------- OLED CONFIG ----------------
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1
#define OLED_ADDR     0x3C
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// ---------------- DHT CONFIG ----------------
#define DHTPIN 4
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

// ---------------- MAX30100 CONFIG ----------------
PulseOximeter pox;
bool max30100_ok = false;

#define REPORTING_PERIOD_MS 1000
uint32_t lastReport = 0;
uint32_t hrStartTime = 0;
bool hrReady = false;

void onBeatDetected() {
  Serial.println("Beat detected!");
}

void setup() {
  Serial.begin(115200);
  delay(2000);

  Wire.begin(21, 22);

  // ---------- OLED ----------
  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)) {
    Serial.println("OLED not found");
    while (true);
  }
  display.setTextColor(SSD1306_WHITE);

  // ---------- DHT ----------
  dht.begin();

  // ---------- MAX30100 ----------
  Serial.println("Initializing MAX30100...");
  if (pox.begin()) {
    max30100_ok = true;

    // 🔴 MAX30100_milan: Increase IR LED current for stronger signal
    pox.setIRLedCurrent(MAX30100_LED_CURR_14_2MA);

    pox.setOnBeatDetectedCallback(onBeatDetected);
    hrStartTime = millis();
    Serial.println("MAX30100 OK");
  } else {
    Serial.println("MAX30100 NOT FOUND");
  }

  // ---------- STARTUP SCREEN ----------
  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("ESP32 Sensor System");
  display.println("------------------");
  display.println("DHT22: OK");
  display.print("MAX30100: ");
  display.println(max30100_ok ? "OK" : "FAIL");
  display.display();

  delay(2000);
}

void loop() {
  // continuously update the sensor
  if (max30100_ok) pox.update();

  // HR warm-up: require 10 seconds of readings
  if (!hrReady && millis() - hrStartTime > 10000) {
    hrReady = true;
  }

  if (millis() - lastReport >= REPORTING_PERIOD_MS) {
    lastReport = millis();

    // ---------- READ DHT ----------
    float temperature = dht.readTemperature();
    float humidity = dht.readHumidity();

    if (isnan(temperature)) temperature = -1;
    if (isnan(humidity)) humidity = -1;

    // ---------- READ HEART RATE ----------
    float heartRate = 0;
    if (max30100_ok && hrReady) {
      heartRate = pox.getHeartRate();
      // Only allow realistic HR values
      if (heartRate < 30 || heartRate > 220) heartRate = 0;
    }

    // ---------- SERIAL OUTPUT ----------
    Serial.print("Temp: ");
    Serial.print(temperature);
    Serial.print(" C | Hum: ");
    Serial.print(humidity);
    Serial.print(" % | HR: ");
    if (!hrReady) Serial.println("Measuring...");
    else if (heartRate == 0) Serial.println("No signal");
    else Serial.println(String(heartRate, 0) + " BPM");

    // ---------- OLED OUTPUT ----------
    display.clearDisplay();
    display.setTextSize(1);

    display.setCursor(0, 0);
    display.println("Temp, Hum & HR");

    display.setCursor(0, 16);
    display.print("Temp: ");
    temperature < 0 ? display.println("Error") : display.println(String(temperature, 1) + " C");

    display.setCursor(0, 32);
    display.print("Hum: ");
    humidity < 0 ? display.println("Error") : display.println(String(humidity, 1) + " %");

    display.setCursor(0, 48);
    display.print("HR: ");
    if (!hrReady) display.println("Measuring...");
    else if (heartRate == 0) display.println("No signal");
    else display.println(String(heartRate, 0) + " BPM");

    display.display();
  }
}
