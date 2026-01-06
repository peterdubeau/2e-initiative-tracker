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
          roll: 17
        },
        {
          name: "Bad Guy 2",
          color: "#892424",
          hidden: false,
          roll: 3
        },
        {
          name: "Environmental hazzard",
          color: "#3255e2",
          roll: 20
        }
      ]
    },
    {
      name: "Encounter 2",
      encounter: [
        {
          name: "BG 1",
          color: "#000000"
        },
        {
          name: "BG 2",
          color: "#000000"
        },
        {
          name: "BG 3",
          color: "#000000",
          hidden: true
        }
      ]
    }
  ]
};



