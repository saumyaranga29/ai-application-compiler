export const evaluationDataset = [
  // 10 Real Product Prompts
  {
    id: "prod-1",
    type: "standard",
    name: "Sales CRM",
    prompt: "Build a CRM with login, contacts management, a metrics dashboard, role-based access, and a premium plan. Admins can view analytics, sales agents can edit contacts, and customers can only view their own dashboard."
  },
  {
    id: "prod-2",
    type: "standard",
    name: "Task Management Suite",
    prompt: "A project manager with boards, lists, and cards. Users can assign tasks, set due dates, add priorities, and mark tasks as complete. Managers can see team efficiency stats."
  },
  {
    id: "prod-3",
    type: "standard",
    name: "Gym Membership Portal",
    prompt: "Gym portal where members can sign up, choose membership tiers (Standard, Premium), and book personal training sessions. Admins view active memberships and revenue charts."
  },
  {
    id: "prod-4",
    type: "standard",
    name: "Restaurant POS",
    prompt: "A restaurant POS where waiters can place orders, kitchens can view active orders and mark them as ready, and managers can manage menu items and view daily revenue sales."
  },
  {
    id: "prod-5",
    type: "standard",
    name: "Hospital Patient Scheduler",
    prompt: "A scheduler for doctor appointments. Patients can book slots, doctors can view their schedule and write prescriptions, and admins manage doctor departments."
  },
  {
    id: "prod-6",
    type: "standard",
    name: "E-Commerce Vendor Portal",
    prompt: "E-Commerce backend dashboard where vendors can list products, edit pricing/stock, and view order history. Customers can browse products and checkout."
  },
  {
    id: "prod-7",
    type: "standard",
    name: "Customer Ticket Portal",
    prompt: "Support ticketing system with tickets, categories, and priority. Agents can claim tickets and reply. Customers submit tickets and view resolution status."
  },
  {
    id: "prod-8",
    type: "standard",
    name: "Warehouse Inventory system",
    prompt: "An inventory system tracking stock levels. Workers can log stock arrival and shipment. Managers can view low stock warnings and generate inventory reports."
  },
  {
    id: "prod-9",
    type: "standard",
    name: "Event Ticket Broker",
    prompt: "Event manager where organizers can create events and sell tickets. Attendees can buy tickets and download receipts. Admins review and approve events."
  },
  {
    id: "prod-10",
    type: "standard",
    name: "Freelancer Invoice Tracker",
    prompt: "Invoicing software for freelancers. Create clients, log work hours, generate PDF invoices, and track payment status (Paid, Unpaid, Overdue). Client can pay invoice."
  },

  // 10 Edge Cases (Vague, Conflicting, Incomplete)
  {
    id: "edge-1",
    type: "edge_case",
    name: "Vague: App like Instagram",
    prompt: "Create an app that is like Instagram but much simpler. Users can do stuff and look at things."
  },
  {
    id: "edge-2",
    type: "edge_case",
    name: "Conflicting: Double Roles Access",
    prompt: "Make a task app. Admins are the only ones who can view tasks, but customers can also view and edit all tasks. Only admins have access to the app, but anyone can log in as a guest to view stats."
  },
  {
    id: "edge-3",
    type: "edge_case",
    name: "Incomplete: Booking App List Only",
    prompt: "A booking app. It should show a table of listings. No other details are provided."
  },
  {
    id: "edge-4",
    type: "edge_case",
    name: "Conflicting: Public Private Data",
    prompt: "A hospital records system where patient records are completely public so anyone can search them, but at the same time they must be strictly private and accessible only by the assigned doctor."
  },
  {
    id: "edge-5",
    type: "edge_case",
    name: "Vague: Management System",
    prompt: "I need a management system for my business operations. It needs data persistence and some forms."
  },
  {
    id: "edge-6",
    type: "edge_case",
    name: "Incomplete: E-Commerce No Products",
    prompt: "An e-commerce store with user registration, shopping cart, and Stripe payment gateway. Do not define any products, inventory, or orders."
  },
  {
    id: "edge-7",
    type: "edge_case",
    name: "Conflicting: Payment Access",
    prompt: "A blog where readers must pay a premium subscription fee to read articles, but all articles are freely accessible to guests without login."
  },
  {
    id: "edge-8",
    type: "edge_case",
    name: "Vague: Smart App",
    prompt: "Build a smart application that predicts user behavior, handles notifications, and manages user lists. Include dashboards."
  },
  {
    id: "edge-9",
    type: "edge_case",
    name: "Incomplete: API DB only",
    prompt: "I need a backend DB and API schema for a rental library. Don't generate any UI layout, sidebar navigation, or pages."
  },
  {
    id: "edge-10",
    type: "edge_case",
    name: "Conflicting: Auto-Delete Admin Only",
    prompt: "A messaging app where all messages are automatically deleted 5 seconds after sending, but admins must be able to view the full chat logs of all historical messages."
  }
];
