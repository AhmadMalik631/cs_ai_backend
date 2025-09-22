import axios from "axios";
import facebookModel from "../models/facebookModel";

export const getAccessToken = async (code) => {
  const tokenRes = await axios.get(
    `https://graph.facebook.com/v19.0/oauth/access_token`,
    {
      params: {
        client_id: process.env.APP_ID,
        client_secret: process.env.APP_SECRET,
        redirect_uri: process.env.REDIRECT_URI,
        code
      }
    }
  );
  console.log("instagram data : ",tokenRes);
  return tokenRes.data.access_token;
};

// export const getPageAndBusiness = async (accessToken) => {
//   // Get Pages
//   const pagesRes = await axios.get(
//     `https://graph.facebook.com/v19.0/me/accounts?access_token=${accessToken}`
//   );
//   const page = pagesRes.data.data[0]; // Pick first page
//   const pageId = page.id;

//   // Get Instagram Business ID
//   const igRes = await axios.get(
//     `https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account&access_token=${accessToken}`
//   );

//   return { pageId, businessId: igRes.data.instagram_business_account.id };
// };

// export const saveAdminInstagram = async ({ pageId, businessId, accessToken }) => {
//   let admin = await Admin.findOne({});
//   if (!admin) {
//     admin = new Admin({ name: "Admin", email: "admin@test.com" });
//   }
//   admin.instagram = {
//     businessId,
//     pageId,
//     accessToken,
//     tokenExpiry: new Date(Date.now() + 60 * 60 * 1000)
//   };
//   await admin.save();
//   return admin;
// };

// export const getMessages = async () => {
//   const admin = await Admin.findOne({});
//   if (!admin) throw new Error("No admin found");

//   const url = `https://graph.facebook.com/v19.0/${admin.instagram.businessId}/conversations?access_token=${admin.instagram.accessToken}`;
//   const response = await axios.get(url);
//   return response.data;
// };

// export const replyToMessage = async (messageId, text) => {
//   const admin = await Admin.findOne({});
//   if (!admin) throw new Error("No admin found");

//   const url = `https://graph.facebook.com/v19.0/${messageId}/messages`;
//   const response = await axios.post(
//     url,
//     { message: { text } },
//     { params: { access_token: admin.instagram.accessToken } }
//   );

//   return response.data;
// };
