using Asp.Versioning;
using BeeMart.Api.Dtos;
using BeeMart.Api.Models;
using BeeMart.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BeeMart.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/auth")]
public class AuthController : ControllerBase
{
    private readonly BeeMartContext _db;
    private readonly TokenService _tokens;

    public AuthController(BeeMartContext db, TokenService tokens)
    {
        _db = db;
        _tokens = tokens;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Username) || string.IsNullOrWhiteSpace(req.FullName) ||
            string.IsNullOrWhiteSpace(req.Password) || string.IsNullOrWhiteSpace(req.RePassword))
            return BadRequest(new { message = "Username, Full Name, Password & Re-Password harus diisi" });

        if (req.Password != req.RePassword)
            return BadRequest(new { message = "Password dan Re-Password tidak sama" });

        if (req.Role != "Admin" && req.Role != "Cashier")
            return BadRequest(new { message = "Role tidak valid" });

        var username = req.Username.Trim();
        if (await _db.MsUsers.AnyAsync(u => u.Username == username))
            return BadRequest(new { message = "username has already exists" });

        // IdUser = 5 digit 
        string id;
        do { id = Random.Shared.Next(10000, 100000).ToString(); }
        while (await _db.MsUsers.AnyAsync(u => u.IdUser == id));

        var user = new MsUser
        {
            IdUser = id,
            Username = username,
            FullName = req.FullName.Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            Role = req.Role,
            Stsrc = true,
            Datein = DateTime.Now,
            Userin = id
        };

        _db.MsUsers.Add(user);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Register berhasil" });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Username) || string.IsNullOrWhiteSpace(req.Password))
            return BadRequest(new { message = "Username dan Password wajib diisi" });

        var username = req.Username.Trim();
        var role = req.Role;

        var user = await _db.MsUsers
            .FirstOrDefaultAsync(u => u.Username == username && u.Role == role && u.Stsrc);

        if (user == null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return Unauthorized(new { message = "Invalid login" });

        return Ok(new
        {
            token = _tokens.Create(user),
            idUser = user.IdUser,
            username = user.Username,
            fullName = user.FullName,
            role = user.Role
        });
    }
}