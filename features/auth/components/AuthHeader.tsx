import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image, StyleSheet, Text, View } from "react-native";

const logo = require("../../../assets/english-practice-logo.jpg");

export function AuthHeader() {
  return (
    <View style={styles.header}>
      <View style={styles.brandRow}>
        <MaterialIcons name="menu-book" size={34} color="#609BED" accessible={false} />
        <View style={styles.logoRing}>
          <Image source={logo} style={styles.logo} accessibilityLabel="Practice Easy English" />
        </View>
        <MaterialIcons name="headphones" size={34} color="#609BED" accessible={false} />
      </View>
      <Text style={styles.slogan}>Learn English. Practice More.{"\n"}Speak Better!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", gap: 10, marginBottom: 16 },
  brandRow: { width: "100%", maxWidth: 264, flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
  logoRing: { borderRadius: 48, padding: 5, backgroundColor: "#CCE3FF" },
  logo: { width: 82, height: 82, borderRadius: 41, borderWidth: 3, borderColor: "#FFFFFF" },
  slogan: { color: "#124A9C", fontSize: 15, lineHeight: 21, fontWeight: "700", fontStyle: "italic", textAlign: "center" },
});
