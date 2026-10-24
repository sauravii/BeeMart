namespace BeeMart.Api.Dtos;

public class CartItemRequest
{
    public string IdProduct { get; set; } = "";
    public int Qty { get; set; }
}

public class CreateTransactionRequest
{
    public int IdPaymentMethod { get; set; }
    public List<CartItemRequest> Items { get; set; } = new();
}