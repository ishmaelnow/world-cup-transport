export function Home() {
  const features = [
    { title: "Quick and Easy Booking", description: "Book your ride in just a few clicks." },
    { title: "Affordable Pricing", description: "Get the best rates for your journeys." },
    { title: "Safe and Reliable", description: "All our drivers are verified and professional." },
    { title: "24/7 Service", description: "Available anytime you need a ride in the Dallas/Fort Worth area." },
    { title: "Wheelchair Accessible", description: "Wheelchair-accessible vehicles are available upon request." },
  ];

  const taxiRates = [
    { category: "Initial Meter Drop", price: "$3.00" },
    { category: "Per 1/4 Mile", price: "$0.70" },
    { category: "Traffic Delay / Waiting Time (Per Min)", price: "$0.40" },
    { category: "Extra Passenger", price: "$2.00" },
    { category: "Minimum Charge (Love Field Airport)", price: "$10.00" },
    { category: "Love Field Trip Fee", price: "$2.00" },
    { category: "Flat Rate (Love Field ↔ Dallas Central Business District)", price: "$26.00" },
    { category: "Flat Rate (DFW Airport ↔ Dallas Central Business District)", price: "$55.00" },
    { category: "DFW Airport Exit Fee", price: "$5.00" },
    { category: "DFW Airport Drop-off Fee", price: "$4.00" },
    { category: "Minimum Fare (DFW Airport to Off-Airport)", price: "$27.00" },
  ];

  return (
    <div className="space-y-12 py-8">
      {/* Features Section */}
      <section>
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Why Choose World Cup Transport?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Taxi Rates Section */}
      <section>
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Taxi Rates</h2>
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Category</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {taxiRates.map((rate, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-700">{rate.category}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">{rate.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}


