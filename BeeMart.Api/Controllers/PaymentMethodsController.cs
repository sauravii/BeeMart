using Asp.Versioning;
using BeeMart.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BeeMart.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Authorize]
[Route("api/v{version:apiVersion}/payment-methods")]
public class PaymentMethodsController : ControllerBase
{
    private readonly BeeMartContext _db;
    public PaymentMethodsController(BeeMartContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var data = await _db.LtPaymentMethods
            .Where(p => p.Stsrc)
            .OrderBy(p => p.IdPaymentMethod)
            .Select(p => new { idPaymentMethod = p.IdPaymentMethod, methodName = p.MethodName })
            .ToListAsync();

        return Ok(data);
    }
}