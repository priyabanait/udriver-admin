import React from 'react'

export const metadata = {
  title: 'Privacy Policy - Udrive',
  description: 'Learn how Udrive collects, uses, and protects your information.',
}

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-gray-50 py-16">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
          <header className="mb-6">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Privacy Policy</h1>
            <p className="text-sm text-gray-500">Effective date: December 22, 2025</p>
          </header>

          <section className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Introduction</h2>
            <p className="text-gray-600 leading-relaxed">
              At <span className="font-semibold">Udrive</span>, we respect your privacy and are committed to protecting your personal information. This policy explains what information we collect, how we use it, and the choices you have.
            </p>
          </section>

          <section className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Information We Collect</h3>
            <ul className="list-disc list-inside text-gray-600 leading-relaxed space-y-1">
              <li>Account information (name, email, phone number)</li>
              <li>Booking and payment details</li>
              <li>Device, usage and location data to improve our services</li>
            </ul>
          </section>

          <section className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">How We Use Your Information</h3>
            <p className="text-gray-600 leading-relaxed">
              We use your information to provide and improve our services, process bookings and payments, communicate with you, and comply with legal obligations. We do not sell your personal information to third parties.
            </p>
          </section>

          <section className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Security</h3>
            <p className="text-gray-600 leading-relaxed">
              We take reasonable measures to protect your information, but no method of transmission over the Internet is 100% secure. If you notice suspicious activity on your account, please contact us immediately.
            </p>
          </section>

          <section className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Your Rights</h3>
            <p className="text-gray-600 leading-relaxed">
              Depending on where you live, you may have rights to access, correct, or delete your personal data. To exercise these rights, contact us at <a href="mailto:support@udrive.com" className="text-green-600">udriveadmin.site</a>.
            </p>
          </section>

          <section className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Contact Us</h3>
            <p className="text-gray-600 leading-relaxed">
              If you have any questions about this policy, please email <a href="mailto:support@udrive.com" className="text-green-600">udriveadmin.site</a> or call +91 8147111911.
            </p>
          </section>

          <footer className="mt-8 border-t pt-6 text-sm text-gray-500">
            <p>Thank you for choosing <span className="font-semibold">Udrive</span>.</p>
          </footer>
        </div>
      </div>
    </main>
  )
}
