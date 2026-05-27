import prisma from "./prisma";
import bcrypt from "bcrypt";

async function main() {
  console.log("Cleaning up existing data...");
  
  // Clean up in reverse relation order
  await prisma.message.deleteMany();
  await prisma.match.deleteMany();
  await prisma.swipe.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.preferences.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  console.log("Hashing default password...");
  const hashedPassword = await bcrypt.hash("password123", 10);

  // Mock data arrays for seed generation
  const courses = [
    "Computer Science",
    "Information Systems",
    "Data Science",
    "Business Analytics",
    "Electrical Engineering"
  ];
  
  const cities = ["Boston", "New York", "Seattle", "San Francisco", "Austin"];
  const hometowns = ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Pune"];
  
  const bios = [
    "Looking for a quiet roommate who respects personal space. I love cooking and playing board games on weekends!",
    "MS CS student. Clean, organized, and open to exploring the city. I usually study at the library until late.",
    "Outgoing and social! I enjoy hiking, trying new coffee shops, and cooking together. Let's team up!",
    "Looking for a comfortable flatshare close to campus. Neat freak who loves watching sports.",
    "Very flexible and easygoing roommate. Passionate about music and tech. Let's find an awesome place!"
  ];

  console.log("Seeding male students...");
  const maleNames = ["Aarav", "Kabir", "Rohan", "Aditya", "Vikram"];
  for (let i = 0; i < maleNames.length; i++) {
    const email = `${maleNames[i].toLowerCase()}@example.com`;
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    });

    await prisma.profile.create({
      data: {
        userId: user.id,
        name: maleNames[i],
        gender: 0, // Male
        currentCity: cities[i % cities.length].toLowerCase(),
        hometown: hometowns[i % hometowns.length],
        course: courses[i % courses.length],
        workEx: parseFloat((i * 1.5).toFixed(1)),
        bio: bios[i % bios.length],
        profileImage: "",
        needRoommate: true,
      },
    });

    await prisma.preferences.create({
      data: {
        userId: user.id,
        rentBudget: 600 + i * 150,
        distFromUni: parseFloat((2.0 + i * 1.2).toFixed(1)),
        maxPpr: (i % 2 === 0) ? 2 : 1,
        alcohol: i % 3,
        smoking: (i + 1) % 3,
        foodPref: i % 3,
        culSkills: (i + 2) % 3,
        housingTypes: i % 2 === 0 ? ["1BHK", "Hall"] : ["2BHK"],
        openToOtherBranch: i % 2,
      },
    });
  }

  console.log("Seeding female students...");
  const femaleNames = ["Ananya", "Diya", "Meera", "Riya", "Isha"];
  for (let i = 0; i < femaleNames.length; i++) {
    const email = `${femaleNames[i].toLowerCase()}@example.com`;
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    });

    await prisma.profile.create({
      data: {
        userId: user.id,
        name: femaleNames[i],
        gender: 1, // Female
        currentCity: cities[(i + 1) % cities.length].toLowerCase(),
        hometown: hometowns[(i + 1) % hometowns.length],
        course: courses[(i + 1) % courses.length],
        workEx: parseFloat((i * 1.2).toFixed(1)),
        bio: bios[(i + 1) % bios.length],
        profileImage: "",
        needRoommate: true,
      },
    });

    await prisma.preferences.create({
      data: {
        userId: user.id,
        rentBudget: 500 + i * 200,
        distFromUni: parseFloat((1.5 + i * 1.5).toFixed(1)),
        maxPpr: (i % 2 === 0) ? 2 : 1,
        alcohol: (i + 1) % 3,
        smoking: i % 3,
        foodPref: (i + 2) % 3,
        culSkills: i % 3,
        housingTypes: i % 2 !== 0 ? ["1BHK", "Hall"] : ["2BHK"],
        openToOtherBranch: (i + 1) % 2,
      },
    });
  }

  console.log("Seeding mock listings...");
  // Grab a couple of users to own listings
  const allUsers = await prisma.user.findMany({ include: { profile: true } });
  if (allUsers.length >= 2) {
    const owner1 = allUsers[0];
    const owner2 = allUsers[5];

    await prisma.listing.create({
      data: {
        userId: owner1.id,
        title: "Spacious 2BHK near Northeastern University",
        description: "Looking for a roommate to share an elegant 2BHK flat. Close to T-station, completely furnished with high-speed internet, central heating, and in-unit laundry.",
        rent: 850,
        address: "75 St Alphonsus St, Boston, MA 02120",
        images: [
          "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80"
        ],
        amenities: ["Furnished", "Laundry", "Wifi", "AC", "Gym"],
      },
    });

    await prisma.listing.create({
      data: {
        userId: owner2.id,
        title: "Cozy Bedroom in 3BHK Apartment - Mission Hill",
        description: "One private bedroom available in a quiet 3BHK flat. Shared with two very clean female grad students. Kitchen is fully stocked with appliances.",
        rent: 750,
        address: "120 Fisher Ave, Boston, MA 02120",
        images: [
          "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80"
        ],
        amenities: ["Furnished", "Laundry", "Wifi", "Dishwasher"],
      },
    });
  }

  console.log("Database seeded successfully! 🎉");
}

main()
  .catch((e) => {
    console.error("Error during database seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
