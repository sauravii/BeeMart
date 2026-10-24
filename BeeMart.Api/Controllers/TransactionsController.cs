using System.Globalization;
using System.Security.Claims;
using Asp.Versioning;
using BeeMart.Api.Dtos;
using BeeMart.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BeeMart.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Authorize]
[Route("api/v{version:apiVersion}/transactions")]
public class TransactionsController : ControllerBase
{
    private readonly BeeMartContext _db;
    public TransactionsController(BeeMartContext db) => _db = db;

    private string CurrentUserId => User.FindFirst("IdUser")!.Value;

    private string CurrentRole =>
        User.FindFirst(ClaimTypes.Role)?.Value
        ?? User.FindFirst("Role")?.Value
        ?? "";

    // Format: [5 digit IdUser][ddMMyy][3 digit nomor urut hari itu]
    private async Task<string> BuildNextInvoiceAsync(string idUser)
    {
        var now = DateTime.Now;
        var start = now.Date;
        var end = start.AddDays(1);

        var count = await _db.TrTransactions
            .CountAsync(t => t.TransactionDate >= start && t.TransactionDate < end);

        var prefix = idUser + now.ToString("ddMMyy", CultureInfo.InvariantCulture);
        var running = count + 1;
        string invoice;
        do
        {
            invoice = prefix + running.ToString("D3");
            running++;
        }
        while (await _db.TrTransactions.AnyAsync(t => t.InvoiceNo == invoice));

        return invoice;
    }

    [HttpGet("next-invoice")]
    public async Task<IActionResult> NextInvoice()
    {
        var invoice = await BuildNextInvoiceAsync(CurrentUserId);
        return Ok(new { invoiceNo = invoice });
    }

    [HttpGet("history")]
    public async Task<IActionResult> History([FromQuery] DateTime? date, [FromQuery] int page = 1)
    {
        if (date is null)
            return BadRequest(new { message = "Tanggal transaksi wajib dipilih." });

        if (page < 1) page = 1;
        const int pageSize = 20;

        var start = date.Value.Date;
        var end = start.AddDays(1);

        var isAdmin = string.Equals(CurrentRole, "Admin", StringComparison.OrdinalIgnoreCase);
        var userId = CurrentUserId;

        var baseQuery =
            from t in _db.TrTransactions.AsNoTracking()
            join u in _db.MsUsers on t.IdUser equals u.IdUser
            join p in _db.LtPaymentMethods on t.IdPaymentMethod equals p.IdPaymentMethod
            where t.Stsrc && t.TransactionDate >= start && t.TransactionDate < end
            select new { t, u, p };

        if (!isAdmin)
            baseQuery = baseQuery.Where(x => x.t.IdUser == userId);

        var totalCount = await baseQuery.CountAsync();

        var items = await baseQuery
            .OrderBy(x => x.t.TransactionDate)
            .ThenBy(x => x.t.InvoiceNo)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new HistoryItemDto(
                x.t.InvoiceNo,
                x.t.TransactionDate,
                x.u.FullName,
                _db.TrTransactionDetails
                    .Where(d => d.IdTransaction == x.t.IdTransaction && d.Stsrc)
                    .Sum(d => d.Qty),
                x.p.MethodName,
                x.t.TotalPrice))
            .ToListAsync();

        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);
        return Ok(new PagedResult<HistoryItemDto>(items, page, pageSize, totalCount, totalPages));
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateTransactionRequest req)
    {
        if (req.Items == null || req.Items.Count == 0)
            return BadRequest(new { message = "Daftar belanjaan masih kosong" });

        if (req.Items.Any(i => i.Qty <= 0))
            return BadRequest(new { message = "Qty harus lebih dari 0" });

        var paymentOk = await _db.LtPaymentMethods
            .AnyAsync(p => p.IdPaymentMethod == req.IdPaymentMethod && p.Stsrc);
        if (!paymentOk)
            return BadRequest(new { message = "Metode pembayaran tidak valid" });

        var grouped = req.Items
            .GroupBy(i => i.IdProduct)
            .Select(g => new { IdProduct = g.Key, Qty = g.Sum(x => x.Qty) })
            .ToList();

        var ids = grouped.Select(g => g.IdProduct).ToList();
        var products = await _db.MsProducts
            .Where(p => ids.Contains(p.IdProduct) && p.Stsrc)
            .ToListAsync();

        var userId = CurrentUserId;
        var now = DateTime.Now;
        var transactionId = Guid.NewGuid().ToString();
        var details = new List<TrTransactionDetail>();
        decimal total = 0;

        foreach (var g in grouped)
        {
            var product = products.FirstOrDefault(p => p.IdProduct == g.IdProduct);
            if (product == null)
                return BadRequest(new { message = "Barang tidak ditemukan" });

            if (g.Qty > product.Stock)
                return BadRequest(new { message = "Jumlah barang yang dimasukkan melebihi sisa stok." });

            var subTotal = Math.Round(product.Price * g.Qty * (1 - product.Discount / 100m), 2);
            total += subTotal;

            product.Stock -= g.Qty;
            product.Dateup = now;
            product.Userup = userId;

            details.Add(new TrTransactionDetail
            {
                IdTransactionDetail = Guid.NewGuid().ToString(),
                IdTransaction = transactionId,
                IdProduct = product.IdProduct,
                Qty = g.Qty,
                Price = product.Price,
                Discount = product.Discount,
                SubTotal = subTotal,
                Stsrc = true,
                Datein = now,
                Userin = userId
            });
        }

        await using var tx = await _db.Database.BeginTransactionAsync();

        var invoice = await BuildNextInvoiceAsync(userId);
        var header = new TrTransaction
        {
            IdTransaction = transactionId,
            InvoiceNo = invoice,
            TransactionDate = now,
            IdUser = userId,
            IdPaymentMethod = req.IdPaymentMethod,
            TotalPrice = total,
            Stsrc = true,
            Datein = now,
            Userin = userId
        };

        _db.TrTransactions.Add(header);
        _db.TrTransactionDetails.AddRange(details);
        await _db.SaveChangesAsync();
        await tx.CommitAsync();

        var next = await BuildNextInvoiceAsync(userId);
        return Ok(new
        {
            message = "Transaksi berhasil",
            invoiceNo = invoice,
            totalPrice = total,
            nextInvoiceNo = next
        });
    }
}