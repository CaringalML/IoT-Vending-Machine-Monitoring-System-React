#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <ArduinoJson.h>
#include <LiquidCrystal_I2C.h>
#include <Keypad.h>
#include <Servo.h>
#include <time.h>

// Provide the token generation process info
#include "addons/TokenHelper.h"
// Provide the RTDB payload printing info and other helper functions
#include "addons/RTDBHelper.h"

// WiFi credentials
#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// Firebase project credentials
#define API_KEY "YOUR_API_KEY"
#define FIREBASE_PROJECT_ID "YOUR_PROJECT_ID"
#define USER_EMAIL "YOUR_EMAIL"
#define USER_PASSWORD "YOUR_PASSWORD"

// Hardware pins
#define SERVO_PIN 18
#define COIN_SENSOR_PIN 19
#define BILL_SENSOR_PIN 21
#define BUZZER_PIN 23
#define LED_PIN 2

// LCD setup (I2C)
LiquidCrystal_I2C lcd(0x27, 16, 2);

// Servo for dispensing
Servo dispenserServo;

// Keypad setup
const byte ROWS = 4;
const byte COLS = 3;
char keys[ROWS][COLS] = {
  {'1','2','3'},
  {'4','5','6'},
  {'7','8','9'},
  {'*','0','#'}
};
byte rowPins[ROWS] = {13, 12, 14, 27};
byte colPins[COLS] = {26, 25, 33};
Keypad keypad = Keypad(makeKeymap(keys), rowPins, colPins, ROWS, COLS);

// Firebase objects
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// Global variables
bool signupOK = false;
float currentCredit = 0.0;
String selectedSlot = "";
String machineId = "ESP32_001";
unsigned long lastUpdateTime = 0;
const unsigned long UPDATE_INTERVAL = 30000; // 30 seconds

// Product structure
struct Product {
  String id;
  String name;
  float price;
  String slot;
  bool active;
};

// Inventory structure
struct InventoryItem {
  String slot;
  String productId;
  int quantity;
  int maxCapacity;
  int lowStockThreshold;
};

// Arrays to store data
Product products[12]; // Max 12 products (A1-A3, B1-B3, C1-C3, D1-D3)
InventoryItem inventory[12];
int productCount = 0;
int inventoryCount = 0;

void setup() {
  Serial.begin(115200);
  
  // Initialize hardware
  initializeHardware();
  
  // Connect to WiFi
  connectToWiFi();
  
  // Configure Firebase
  configureFirebase();
  
  // Initialize time
  configTime(0, 0, "pool.ntp.org");
  
  // Load initial data from Firebase
  loadProductsFromFirebase();
  loadInventoryFromFirebase();
  
  // Display welcome message
  displayWelcomeMessage();
  
  Serial.println("Vending Machine initialized successfully!");
}

void loop() {
  // Check for keypad input
  char key = keypad.getKey();
  if (key) {
    handleKeypadInput(key);
  }
  
  // Check coin/bill sensors
  checkPaymentSensors();
  
  // Update machine status periodically
  if (millis() - lastUpdateTime > UPDATE_INTERVAL) {
    updateMachineStatus();
    lastUpdateTime = millis();
  }
  
  // Update display
  updateDisplay();
  
  delay(100);
}

void initializeHardware() {
  // Initialize LCD
  lcd.init();
  lcd.backlight();
  
  // Initialize servo
  dispenserServo.attach(SERVO_PIN);
  dispenserServo.write(0); // Initial position
  
  // Initialize pins
  pinMode(COIN_SENSOR_PIN, INPUT_PULLUP);
  pinMode(BILL_SENSOR_PIN, INPUT_PULLUP);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  
  // LED startup sequence
  for (int i = 0; i < 3; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(200);
    digitalWrite(LED_PIN, LOW);
    delay(200);
  }
}

void connectToWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Connecting WiFi");
  
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    digitalWrite(LED_PIN, !digitalRead(LED_PIN));
    delay(300);
  }
  
  Serial.println();
  Serial.print("Connected with IP: ");
  Serial.println(WiFi.localIP());
  
  digitalWrite(LED_PIN, HIGH);
  
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("WiFi Connected");
  delay(2000);
}

void configureFirebase() {
  config.api_key = API_KEY;
  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;
  
  config.token_status_callback = tokenStatusCallback;
  
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  
  // Check authentication
  while (!Firebase.ready()) {
    Serial.println("Connecting to Firebase...");
    delay(1000);
  }
  
  Serial.println("Firebase connected successfully!");
  signupOK = true;
}

void loadProductsFromFirebase() {
  if (Firebase.ready() && signupOK) {
    Serial.println("Loading products from Firebase...");
    
    if (Firebase.Firestore.getDocument(&fbdo, FIREBASE_PROJECT_ID, "", "products", "")) {
      FirebaseJson json;
      json.setJsonData(fbdo.payload().c_str());
      
      // Parse products data
      // This is a simplified version - you'll need to implement proper JSON parsing
      productCount = 0;
      
      // Add sample products for testing
      products[0] = {"prod_001", "Coca Cola", 2.50, "A1", true};
      products[1] = {"prod_002", "Pepsi", 2.50, "A2", true};
      products[2] = {"prod_003", "Water", 1.50, "A3", true};
      products[3] = {"prod_004", "Chips", 3.00, "B1", true};
      productCount = 4;
      
      Serial.println("Products loaded successfully!");
    } else {
      Serial.println("Failed to load products");
    }
  }
}

void loadInventoryFromFirebase() {
  if (Firebase.ready() && signupOK) {
    Serial.println("Loading inventory from Firebase...");
    
    // Add sample inventory for testing
    inventory[0] = {"A1", "prod_001", 15, 20, 5};
    inventory[1] = {"A2", "prod_002", 12, 20, 5};
    inventory[2] = {"A3", "prod_003", 8, 20, 5};
    inventory[3] = {"B1", "prod_004", 3, 20, 5}; // Low stock
    inventoryCount = 4;
    
    Serial.println("Inventory loaded successfully!");
  }
}

void handleKeypadInput(char key) {
  if (key >= '1' && key <= '9') {
    // Product selection
    String slot = getSlotFromKey(key);
    selectProduct(slot);
  } else if (key == '*') {
    // Cancel/Reset
    cancelTransaction();
  } else if (key == '#') {
    // Confirm purchase
    processPurchase();
  } else if (key == '0') {
    // Return change
    returnChange();
  }
}

String getSlotFromKey(char key) {
  // Map keypad numbers to slots
  switch (key) {
    case '1': return "A1";
    case '2': return "A2";
    case '3': return "A3";
    case '4': return "B1";
    case '5': return "B2";
    case '6': return "B3";
    case '7': return "C1";
    case '8': return "C2";
    case '9': return "C3";
    default: return "";
  }
}

void selectProduct(String slot) {
  selectedSlot = slot;
  
  // Find product info
  Product selectedProduct;
  bool productFound = false;
  
  for (int i = 0; i < productCount; i++) {
    if (products[i].slot == slot && products[i].active) {
      selectedProduct = products[i];
      productFound = true;
      break;
    }
  }
  
  if (!productFound) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Product N/A");
    lcd.setCursor(0, 1);
    lcd.print("Try another");
    delay(2000);
    return;
  }
  
  // Check inventory
  int stockLevel = getStockLevel(slot);
  if (stockLevel <= 0) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Out of Stock");
    lcd.setCursor(0, 1);
    lcd.print("Try another");
    delay(2000);
    return;
  }
  
  // Display product info
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(selectedProduct.name);
  lcd.setCursor(0, 1);
  lcd.print("$");
  lcd.print(selectedProduct.price, 2);
  lcd.print(" Press # to buy");
  
  playBeep(1);
}

int getStockLevel(String slot) {
  for (int i = 0; i < inventoryCount; i++) {
    if (inventory[i].slot == slot) {
      return inventory[i].quantity;
    }
  }
  return 0;
}

void checkPaymentSensors() {
  // Check coin sensor
  if (digitalRead(COIN_SENSOR_PIN) == LOW) {
    delay(50); // Debounce
    if (digitalRead(COIN_SENSOR_PIN) == LOW) {
      addCredit(0.50); // Assume 50 cent coin
      while (digitalRead(COIN_SENSOR_PIN) == LOW) {
        delay(10);
      }
    }
  }
  
  // Check bill sensor
  if (digitalRead(BILL_SENSOR_PIN) == LOW) {
    delay(50); // Debounce
    if (digitalRead(BILL_SENSOR_PIN) == LOW) {
      addCredit(5.00); // Assume $5 bill
      while (digitalRead(BILL_SENSOR_PIN) == LOW) {
        delay(10);
      }
    }
  }
}

void addCredit(float amount) {
  currentCredit += amount;
  
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Credit: $");
  lcd.print(currentCredit, 2);
  lcd.setCursor(0, 1);
  lcd.print("Select product");
  
  playBeep(2);
  
  Serial.print("Credit added: $");
  Serial.print(amount, 2);
  Serial.print(" Total: $");
  Serial.println(currentCredit, 2);
}

void processPurchase() {
  if (selectedSlot == "") {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Select product");
    lcd.setCursor(0, 1);
    lcd.print("first");
    delay(2000);
    return;
  }
  
  // Find selected product
  Product selectedProduct;
  bool productFound = false;
  
  for (int i = 0; i < productCount; i++) {
    if (products[i].slot == selectedSlot && products[i].active) {
      selectedProduct = products[i];
      productFound = true;
      break;
    }
  }
  
  if (!productFound) {
    cancelTransaction();
    return;
  }
  
  // Check if enough credit
  if (currentCredit < selectedProduct.price) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Insufficient");
    lcd.setCursor(0, 1);
    lcd.print("credit");
    delay(2000);
    return;
  }
  
  // Check stock again
  int stockLevel = getStockLevel(selectedSlot);
  if (stockLevel <= 0) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Out of Stock");
    delay(2000);
    cancelTransaction();
    return;
  }
  
  // Process purchase
  currentCredit -= selectedProduct.price;
  
  // Dispense product
  dispenseProduct(selectedSlot);
  
  // Update inventory
  updateInventoryAfterSale(selectedSlot);
  
  // Record sale in Firebase
  recordSale(selectedProduct);
  
  // Show completion message
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Enjoy your");
  lcd.setCursor(0, 1);
  lcd.print(selectedProduct.name);
  delay(3000);
  
  // Handle change
  if (currentCredit > 0) {
    returnChange();
  } else {
    // Reset for next customer
    selectedSlot = "";
    displayWelcomeMessage();
  }
}

void dispenseProduct(String slot) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Dispensing...");
  
  // Servo operation to dispense product
  dispenserServo.write(90);
  delay(1000);
  dispenserServo.write(0);
  
  playBeep(3);
  
  Serial.println("Product dispensed: " + slot);
}

void updateInventoryAfterSale(String slot) {
  for (int i = 0; i < inventoryCount; i++) {
    if (inventory[i].slot == slot) {
      inventory[i].quantity--;
      
      // Update Firebase inventory
      if (Firebase.ready() && signupOK) {
        FirebaseJson updateJson;
        updateJson.set("quantity", inventory[i].quantity);
        updateJson.set("updatedAt", getTimestamp());
        
        String documentPath = "inventory/" + slot;
        Firebase.Firestore.patchDocument(&fbdo, FIREBASE_PROJECT_ID, "", documentPath.c_str(), updateJson.raw());
      }
      
      Serial.println("Inventory updated for " + slot + ": " + String(inventory[i].quantity));
      break;
    }
  }
}

void recordSale(Product product) {
  if (Firebase.ready() && signupOK) {
    FirebaseJson saleJson;
    saleJson.set("productId", product.id);
    saleJson.set("slot", product.slot);
    saleJson.set("price", product.price);
    saleJson.set("machineId", machineId);
    saleJson.set("paymentMethod", "cash");
    saleJson.set("success", true);
    saleJson.set("timestamp", getTimestamp());
    
    Firebase.Firestore.createDocument(&fbdo, FIREBASE_PROJECT_ID, "", "sales", "", saleJson.raw());
    
    Serial.println("Sale recorded: " + product.name + " - $" + String(product.price, 2));
  }
}

void cancelTransaction() {
  selectedSlot = "";
  
  if (currentCredit > 0) {
    returnChange();
  } else {
    displayWelcomeMessage();
  }
  
  playBeep(1);
}

void returnChange() {
  if (currentCredit > 0) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Returning $");
    lcd.print(currentCredit, 2);
    lcd.setCursor(0, 1);
    lcd.print("Thank you!");
    
    // Simulate coin return (you'd control actual coin mechanism here)
    playBeep(2);
    delay(3000);
    
    currentCredit = 0.0;
  }
  
  selectedSlot = "";
  displayWelcomeMessage();
}

void updateMachineStatus() {
  if (Firebase.ready() && signupOK) {
    FirebaseJson statusJson;
    statusJson.set("online", true);
    statusJson.set("lastHeartbeat", getTimestamp());
    statusJson.set("wifiStrength", WiFi.RSSI());
    statusJson.set("freeMemory", ESP.getFreeHeap());
    statusJson.set("uptime", millis());
    
    // Check for low stock alerts
    FirebaseJson alertsArray;
    int alertCount = 0;
    for (int i = 0; i < inventoryCount; i++) {
      if (inventory[i].quantity <= inventory[i].lowStockThreshold) {
        FirebaseJson alert;
        alert.set("slot", inventory[i].slot);
        alert.set("quantity", inventory[i].quantity);
        alert.set("threshold", inventory[i].lowStockThreshold);
        alertsArray.set("[" + String(alertCount) + "]", alert);
        alertCount++;
      }
    }
    statusJson.set("lowStockAlerts", alertsArray);
    
    String documentPath = "machine_status/" + machineId;
    Firebase.Firestore.setDocument(&fbdo, FIREBASE_PROJECT_ID, "", documentPath.c_str(), statusJson.raw());
    
    Serial.println("Machine status updated");
  }
}

void updateDisplay() {
  // This function can be used for dynamic display updates
  // Currently handled by other functions
}

void displayWelcomeMessage() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Welcome!");
  lcd.setCursor(0, 1);
  lcd.print("Select product");
}

void playBeep(int count) {
  for (int i = 0; i < count; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(100);
    digitalWrite(BUZZER_PIN, LOW);
    delay(100);
  }
}

String getTimestamp() {
  time_t now;
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    return String(millis()); // Fallback to millis if time sync fails
  }
  
  char timestamp[64];
  strftime(timestamp, sizeof(timestamp), "%Y-%m-%dT%H:%M:%S", &timeinfo);
  return String(timestamp);
}

// Firebase token status callback
void tokenStatusCallback(TokenInfo info) {
  Serial.printf("Token info: type = %s, status = %s\n", getTokenType(info).c_str(), getTokenStatus(info).c_str());
}