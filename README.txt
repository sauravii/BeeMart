================================================================================
BeeMart - Point of Sale Web App (.NET 8)
IT Bootcamp Basic AMJS 2027 - Mini Project
================================================================================

--------------------------------------------------------------------------------
PROJECTS
--------------------------------------------------------------------------------
  BeeMart.Api         Backend: ASP.NET Core Web API, EF Core, SQL Server
  BeeMart.WebClient   Frontend: ASP.NET Core MVC (plain HTML/CSS/JS, no Bootstrap).
                      Talks to the API only, no direct database access.
  BeeMart.sql         Database script (tables + seed data) located at root directory

--------------------------------------------------------------------------------
REQUIREMENTS
--------------------------------------------------------------------------------
  - .NET 8 SDK
  - SQL Server (Express is fine) + SSMS
  - Internet connection for NuGet restore

--------------------------------------------------------------------------------
HOW TO RUN
--------------------------------------------------------------------------------
  1. Database
     - Open BeeMart.sql in SSMS and press F5.
     - It creates the "BeeMart" database, tables, and seed data
       (products, payment methods, users).

  2. Connection string (only change it if your SQL Server name is different)
     - File: BeeMart.Api/appsettings.json -> ConnectionStrings:Default
     - Default:
       Server=localhost\SQLEXPRESS;Database=BeeMart;Trusted_Connection=True;TrustServerCertificate=True
       (Use a double backslash in the JSON file: localhost\\SQLEXPRESS)

  3. Start the API first (Terminal 1)
       cd BeeMart.Api
       dotnet run
     - API:     http://localhost:5100
     - Swagger: http://localhost:5100/swagger

  4. Then start the WebClient (Terminal 2)
       cd BeeMart.WebClient
       dotnet run
     - App:     http://localhost:5200

  ------------------------------------------------------------------------------
  ALTERNATIVE (VISUAL STUDIO IDE):
    Configure Startup Projects -> Multiple Startup Projects -> Start both projects.

  CONFIGURATION & PORTS:
    - Ports are fixed in each project's Properties/launchSettings.json.
    - The API address used by the WebClient is configured in:
      BeeMart.WebClient/wwwroot/js/config.js

--------------------------------------------------------------------------------
TEST ACCOUNTS (SEEDED)
--------------------------------------------------------------------------------
  +---------+----------+----------+------------------------+
  | Role    | Username | Password | Role in Login Dropdown |
  +---------+----------+----------+------------------------+
  | Admin   | admin    | admin123 | Admin                  |
  | Cashier | kasir1   | kasir111 | Kasir                  |
  | Cashier | kasir2   | kasir222 | Kasir                  |
  +---------+----------+----------+------------------------+

--------------------------------------------------------------------------------
FEATURES
--------------------------------------------------------------------------------
  - Login / Register:
    Hashed passwords (BCrypt), unique username, JWT auth.

  - New Transaction (Admin & Cashier):
    Real-time clock, auto invoice number [5-digit user ID][ddMMyy][3-digit running number],
    product search (max 10 results), stock validation, cart, payment methods from API.

  - History Transaction:
    Date picker, 20 rows per page, ordered ascending by date/time.
    Cashier sees own transactions only, Admin sees all cashiers.

  - Architecture & Security:
    API is versioned (/api/v1/...), role-based authorization is enforced
    on the server.

--------------------------------------------------------------------------------
TIP FOR TESTING
--------------------------------------------------------------------------------
  - Products are grocery items. Search for "susu", "indomie", or "teh".
  - Items with a discount:
    * "Lemonilo Mie Goreng" (5%)
    * "Samyang Hot Chicken Ramen" (10%)
================================================================================