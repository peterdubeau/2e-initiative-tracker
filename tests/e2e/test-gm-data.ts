// Test GM data - hardcoded JSON object for E2E tests
// This prevents test data from appearing in the production app
export const TEST_GM_DATA = {
  name: "E2e_Test",
  Password: "123456",
  encounters: [
    {
      name: "Encounter 1",
      encounter: [
        {
          name: "Bad Guy 1",
          color: "#000000",
          roll: 17,
          hp: 40,
          maxHp: 40
        },
        {
          name: "Bad Guy 2",
          color: "#892424",
          hidden: false,
          roll: 3,
          hp: 25,
          maxHp: 30
        },
        {
          name: "Environmental hazzard",
          color: "#3255e2",
          roll: 20,
          hp: 10,
          maxHp: 10
        }
      ]
    },
    {
      name: "Encounter 2",
      encounter: [
        {
          name: "BG 1",
          color: "#000000",
          hp: 20,
          maxHp: 20
        },
        {
          name: "BG 2",
          color: "#000000",
          hp: 15,
          maxHp: 15
        },
        {
          name: "BG 3",
          color: "#000000",
          hidden: true,
          hp: 50,
          maxHp: 50
        }
      ]
    }
  ]
};






