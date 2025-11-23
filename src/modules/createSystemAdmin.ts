require("dotenv").config();
const bcrypt = require("bcrypt");
import { Admin } from "./admin";

// Function to create an initial admin account
export async function createInitialAdmin() {
  try {
    const foundAdmin = await Admin.findOne({ email: process.env.AdminEmail });

    if (!foundAdmin) {
      const password = process.env.AdminPassword; // Set an initial password
      const hashedPassword = await bcrypt.hash(password, 10);

      const newAdmin = new Admin({
        first_name: process.env.AdminFirstName,    // Set the first name
        middle_name: process.env.AdminMiddleName,  // Set the middle name
        email: process.env.AdminEmail,
        password: hashedPassword,
        role: "superAdmin", // Assign the admin role (you may need to add role to the schema if not present)
      });

      await newAdmin.save();
      console.log("Initial admin account created.");
    } else {
      console.log("Initial admin account already exists.");
    }
  } catch (error) {
    console.error("Error creating initial admin account:", error);
  }
}
