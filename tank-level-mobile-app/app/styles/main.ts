import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "#2196F3",
    padding: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
  adminBadge: {
    backgroundColor: "#FF9800",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    marginTop: 10,
  },
  adminBadgeText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 12,
  },
  section: {
    backgroundColor: "white",
    margin: 10,
    padding: 15,
    borderRadius: 10,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },
  button: {
    backgroundColor: "#2196F3",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginVertical: 5,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  scanningContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  disconnectButton: {
    backgroundColor: "#F44336",
    margin: 10,
  },
  deviceItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  deviceName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  deviceId: {
    fontSize: 12,
    color: "#666",
  },
  deviceInfo: {
    fontSize: 10,
    color: "#999",
    fontStyle: "italic",
  },
  deviceWarning: {
    fontSize: 11,
    color: "#FF9800",
    fontStyle: "italic",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginVertical: 5,
    fontSize: 16,
  },
  tankSection: {
    flexDirection: "row",
    justifyContent: "space-around",
    margin: 10,
  },
  tankCard: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    elevation: 2,
    flex: 1,
    margin: 5,
    alignItems: "center",
  },
  tankTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  levelIndicator: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 10,
  },
  levelText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
  stabilityText: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
  },
  alertRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  ackButton: {
    backgroundColor: "#FF9800",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    marginTop: 10,
  },
  ackButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  infoText: {
    fontSize: 12,
    color: "#666",
    marginBottom: 10,
    fontStyle: "italic",
  },
  warningText: {
    fontSize: 12,
    color: "#F44336",
    marginBottom: 10,
    fontStyle: "italic",
  },
  chartContainer: {
    backgroundColor: "white",
    margin: 10,
    padding: 15,
    borderRadius: 10,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
});

export default styles;